import { OperationLogger } from "./logger.js";
import { OperationLog } from "./config.js";
import { Notes } from "../apps/notes.js";
import { Reminders } from "../apps/reminders.js";
import { Calendar } from "../apps/calendar.js";
import { AppleScriptRunner } from "./apple-script.js";

/**
 * Recovery Manager
 * Handles recovery of deleted/modified content from operation logs
 */
export class RecoveryManager {
  private static instance: RecoveryManager;
  private logger: OperationLogger;
  private notes: Notes;
  private reminders: Reminders;
  private calendar: Calendar;

  private constructor() {
    this.logger = OperationLogger.getInstance();
    this.notes = new Notes();
    this.reminders = new Reminders();
    this.calendar = new Calendar();
  }

  static getInstance(): RecoveryManager {
    if (!RecoveryManager.instance) {
      RecoveryManager.instance = new RecoveryManager();
    }
    return RecoveryManager.instance;
  }

  /**
   * List recoverable operations
   */
  async listRecoverableOperations(options?: {
    app?: "notes" | "reminders" | "calendar";
    operation?: "delete" | "update";
    limit?: number;
  }): Promise<OperationLog[]> {
    const logs = await this.logger.readLogs({
      app: options?.app,
      operation: options?.operation,
      limit: options?.limit || 50,
    });

    // Filter to only operations that can be recovered (have 'before' data)
    return logs.filter((log) => log.data.before !== undefined);
  }

  /**
   * Get operation details for recovery
   */
  async getRecoveryDetails(operationId: string): Promise<{
    operation: OperationLog;
    canRecover: boolean;
    reason?: string;
  } | null> {
    const operation = await this.logger.getOperation(operationId);

    if (!operation) {
      return null;
    }

    // Check if operation can be recovered
    if (!operation.data.before) {
      return {
        operation,
        canRecover: false,
        reason: "No backup data available for this operation",
      };
    }

    if (operation.operation === "create") {
      return {
        operation,
        canRecover: false,
        reason: "Cannot recover create operations (item still exists)",
      };
    }

    return {
      operation,
      canRecover: true,
    };
  }

  /**
   * Recover a deleted or modified item
   */
  async recover(
    operationId: string,
    confirmId: string,
  ): Promise<{
    success: boolean;
    message: string;
    newOperationId?: string;
  }> {
    // Safety check: require exact operation ID confirmation
    if (operationId !== confirmId) {
      return {
        success: false,
        message: `Recovery cancelled: Confirmation ID "${confirmId}" does not match "${operationId}". To recover, you must provide the exact operation ID as confirmation.`,
      };
    }

    const details = await this.getRecoveryDetails(operationId);

    if (!details) {
      return {
        success: false,
        message: `Operation ${operationId} not found`,
      };
    }

    if (!details.canRecover) {
      return {
        success: false,
        message: `Cannot recover: ${details.reason}`,
      };
    }

    const { operation } = details;

    try {
      let result: string;
      let newOpId: string;

      switch (operation.app) {
        case "notes":
          result = await this.recoverNote(operation);
          // If native recovery succeeded, we just log the create event manually to record the restoration
          newOpId = await this.logger.log(
            "create",
            "notes",
            operation.target,
            {
              after: operation.data.before,
            },
            {
              confirmed: true,
              folder: operation.metadata.folder,
              user:
                (operation.metadata.user || process.env.USER) +
                " (via recovery)",
            },
          );
          break;

        case "reminders":
          result = await this.recoverReminder(operation);
          newOpId = await this.logger.log(
            "create",
            "reminders",
            operation.target,
            {
              after: operation.data.before,
            },
            {
              confirmed: true,
              folder: operation.metadata.folder,
              user:
                (operation.metadata.user || process.env.USER) +
                " (via recovery)",
            },
          );
          break;

        case "calendar":
          result = await this.recoverCalendarEvent(operation);
          newOpId = await this.logger.log(
            "create",
            "calendar",
            operation.target,
            {
              after: operation.data.before,
            },
            {
              confirmed: true,
              user:
                (operation.metadata.user || process.env.USER) +
                " (via recovery)",
            },
          );
          break;

        default:
          return {
            success: false,
            message: `Recovery not supported for app: ${operation.app}`,
          };
      }

      return {
        success: true,
        message: `Successfully recovered: ${result}`,
        newOperationId: newOpId,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Recovery failed: ${error.message}`,
      };
    }
  }

  /**
   * Recover a deleted note
   */
  private async recoverNote(operation: OperationLog): Promise<string> {
    const { title } = operation.target;
    const content = operation.data.before;
    const originalFolder = operation.metadata.folder || "Notes";

    if (!title) {
      throw new Error("Missing note title for recovery");
    }

    // Attempt native recovery first (move from Recently Deleted)
    try {
      // In Notes app, 'Recently Deleted' is a special folder.
      // We look for it and move the note back.
      const nativeResult = await AppleScriptRunner.execute(`
        tell application "Notes"
          try
            -- In newer macOS, 'Recently Deleted' is often an account property or 
            -- a folder. We iterate through accounts to find it.
            set deletedNote to missing value
            set targetAccount to missing value

            repeat with acc in accounts
              try
                set deletedFolder to folder "Recently Deleted" of acc
                set deletedNote to (first note of deletedFolder whose name is "${title}")
                set targetAccount to acc
                exit repeat
              end try
            end repeat

            if deletedNote is not missing value then
              -- Find or create target folder in the same account
              set targetF to folder "${originalFolder}" of targetAccount
              move deletedNote to targetF
              return "native_success"
            else
              return "no_note_found"
            end if
          on error err
            return "error: " & err
          end try
        end tell
      `);

      if (nativeResult === "native_success") {
        return `Note "${title}" recovered natively by moving back to "${originalFolder}"`;
      }
    } catch (error) {
      console.log(`[Recovery] Native recovery check failed or error: ${error}`);
    }

    // Fallback: Re-create the note
    if (!content || typeof content !== "string") {
      throw new Error("Missing note content for fallback recovery");
    }
    return await this.notes.create(title, content, originalFolder, {
      skipLog: true,
    });
  }

  /**
   * Recover a deleted reminder
   */
  private async recoverReminder(operation: OperationLog): Promise<string> {
    const { text } = operation.target;
    const data = operation.data.before;
    const originalList = operation.metadata.folder || "Reminders";

    if (!text) {
      throw new Error("Missing reminder text for recovery");
    }

    // Attempt native recovery (check completed or recently deleted)
    try {
      const nativeResult = await AppleScriptRunner.execute(`
        tell application "Reminders"
          try
            set targetList to list "${originalList}"
            -- Try to find in the original list if it was just completed
            set matchingReminders to (every reminder of targetList whose name is "${text}")
            if (count of matchingReminders) > 0 then
              set theReminder to item 1 of matchingReminders
              set completed of theReminder to false
              return "native_success"
            end if
            
            -- Try to find in Recently Deleted if available
            repeat with l in lists
              if name of l is "Recently Deleted" then
                set matching to (every reminder of l whose name is "${text}")
                if (count of matching) > 0 then
                  set theR to item 1 of matching
                  move theR to targetList
                  set completed of theR to false
                  return "native_success"
                end if
              end if
            end repeat
            return "no_match"
          on error err
            return "error: " & err
          end try
        end tell
      `);

      if (nativeResult === "native_success") {
        return `Reminder "${text}" recovered natively in list "${originalList}"`;
      }
    } catch (error) {
      // Ignore and fallback
    }

    // Fallback: Re-create the reminder
    const dueDate =
      typeof data === "object" ? (data as any).dueDate : undefined;
    return await this.reminders.add(text, dueDate, originalList);
  }

  /**
   * Recover a deleted calendar event
   */
  private async recoverCalendarEvent(operation: OperationLog): Promise<string> {
    const { summary } = operation.target;
    const data = operation.data.before;

    if (!summary || !data?.startDate || !data?.endDate) {
      throw new Error("Missing calendar event data for recovery");
    }

    return await this.calendar.createEvent(
      summary,
      data.startDate,
      data.endDate,
      data.calendar,
      data.location,
    );
  }

  /**
   * Get recovery statistics
   */
  async getRecoveryStats(): Promise<{
    totalOperations: number;
    recoverableOperations: number;
    byApp: Record<string, number>;
    byOperation: Record<string, number>;
  }> {
    const allLogs = await this.logger.readLogs({ limit: 1000 });
    const recoverable = allLogs.filter((log) => log.data.before !== undefined);

    const byApp: Record<string, number> = {};
    const byOperation: Record<string, number> = {};

    for (const log of recoverable) {
      byApp[log.app] = (byApp[log.app] || 0) + 1;
      byOperation[log.operation] = (byOperation[log.operation] || 0) + 1;
    }

    return {
      totalOperations: allLogs.length,
      recoverableOperations: recoverable.length,
      byApp,
      byOperation,
    };
  }
}
