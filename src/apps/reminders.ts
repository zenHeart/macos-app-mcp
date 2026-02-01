import { AppleScriptRunner } from "../utils/apple-script.js";
import { ConfigManager } from "../utils/config.js";
import { OperationLogger } from "../utils/logger.js";
import { generateAppleScriptDate } from "../utils/date-parser.js";

/**
 * Reminders Application Integration
 * Provides full CRUD functionality for macOS Reminders with support for lists and due dates
 */
export class Reminders {
  private config = ConfigManager.getInstance();
  private logger = OperationLogger.getInstance();

  /**
   * List incomplete reminders
   * @param listName - Optional list name. If not provided, searches across all lists if supported, or uses default.
   * @returns List of reminders
   */
  async list(listName?: string): Promise<string[]> {
    const target = listName ? `of list "${listName}"` : "";
    // Note: 'every reminder' without a list context might only search the default list or error in some versions.
    // Explicitly targeting lists if not provided might be better, but we follow the current pattern.
    const result = await AppleScriptRunner.execute(
      `tell application "Reminders" to get name of every reminder ${target} whose completed is false`,
      "Reminders",
    );
    return AppleScriptRunner.parseList(result);
  }

  /**
   * Ensure a reminder list exists, creating it if necessary
   */
  private async ensureList(listName: string): Promise<void> {
    const checkScript = `
      tell application "Reminders"
        try
          set targetList to list "${listName}"
          return "exists"
        on error
          return "not found"
        end try
      end tell
    `;

    const result = await AppleScriptRunner.execute(checkScript, "Reminders");
    if (result.trim() === "exists") return;

    // Create the list
    const createScript = `
      tell application "Reminders"
        make new list with properties {name:"${listName}"}
      end tell
    `;
    await AppleScriptRunner.execute(createScript, "Reminders");
  }

  /**
   * Add a new reminder
   * @param text - Reminder content
   * @param due - Optional due date string (e.g. "2023-12-31 10:00")
   * @param listName - Optional list name (defaults to default list)
   * @returns Success message
   */
  async add(text: string, due?: string, listName?: string): Promise<string> {
    const targetList = listName || this.config.getDefaultRemindersList();

    // Ensure list exists before adding reminder
    if (targetList) {
      await this.ensureList(targetList);
    }

    // Correct syntax is "at end of list" or "in list"
    const listClause = targetList ? `at end of list "${targetList}"` : "";

    if (due) {
      // Generate date setup code
      const { setupCode, variableName } = generateAppleScriptDate(
        due,
        "dueDate",
      );

      await AppleScriptRunner.execute(
        `
        tell application "Reminders"
          ${setupCode}
          make new reminder ${listClause} with properties {name:"${text}", due date:${variableName}}
        end tell
      `,
        "Reminders",
      );
    } else {
      await AppleScriptRunner.execute(
        `
        tell application "Reminders"
          make new reminder ${listClause} with properties {name:"${text}"}
        end tell
      `,
        "Reminders",
      );
    }

    // Log the operation
    await this.logger.log(
      "create",
      "reminders",
      { text },
      { after: { text, due } },
      { folder: targetList },
    );

    return `Reminder "${text}" added successfully to list "${targetList}"`;
  }

  /**
   * Complete a reminder (mark as done)
   */
  async complete(text: string, listName?: string): Promise<string> {
    const listClause = listName ? `of list "${listName}"` : "";

    await AppleScriptRunner.execute(
      `
      tell application "Reminders"
        set theReminder to first reminder ${listClause} whose name is "${text}" and completed is false
        set completed of theReminder to true
      end tell
    `,
      "Reminders",
    );

    // Log the operation
    await this.logger.log(
      "update",
      "reminders",
      { text },
      { before: { completed: false }, after: { completed: true } },
      { folder: listName },
    );

    return `Reminder "${text}" marked as completed`;
  }

  /**
   * Update a reminder's text or due date
   */
  async update(
    oldText: string,
    newText?: string,
    newDue?: string,
    listName?: string,
  ): Promise<string> {
    if (!this.config.canUpdate()) {
      throw new Error("Update operations are disabled.");
    }

    const listClause = listName ? `of list "${listName}"` : "";
    const nameUpdate = newText ? `set name of theReminder to "${newText}"` : "";

    // Get old state for logging - use a more precise query
    const oldDue = await AppleScriptRunner.execute(
      `
      tell application "Reminders"
        set theReminder to first reminder ${listClause} whose name is "${oldText}" and completed is false
        return due date of theReminder as string
      end tell
    `,
      "Reminders",
    );

    if (newDue) {
      // Generate date setup code for new due date
      const { setupCode, variableName } = generateAppleScriptDate(
        newDue,
        "newDueDate",
      );
      const dueUpdate = `set due date of theReminder to ${variableName}`;

      await AppleScriptRunner.execute(
        `
        tell application "Reminders"
          ${setupCode}
          set theReminder to first reminder ${listClause} whose name is "${oldText}" and completed is false
          ${nameUpdate}
          ${dueUpdate}
        end tell
      `,
        "Reminders",
      );
    } else if (nameUpdate) {
      await AppleScriptRunner.execute(
        `
        tell application "Reminders"
          set theReminder to first reminder ${listClause} whose name is "${oldText}" and completed is false
          ${nameUpdate}
        end tell
      `,
        "Reminders",
      );
    }

    // Log the operation
    await this.logger.log(
      "update",
      "reminders",
      { text: oldText },
      {
        before: { text: oldText, due: oldDue },
        after: { text: newText || oldText, due: newDue || oldDue },
      },
      { folder: listName },
    );

    return `Reminder "${oldText}" updated successfully`;
  }

  /**
   * Delete a reminder with confirmation
   */
  async delete(
    text: string,
    confirmText: string,
    listName?: string,
  ): Promise<string> {
    if (!this.config.canDelete()) {
      throw new Error("Delete operations are disabled.");
    }

    if (text !== confirmText) {
      throw new Error(`Deletion cancelled: Confirmation text does not match.`);
    }

    const listClause = listName ? `of list "${listName}"` : "";

    // Get original list name if not provided
    let actualList = listName;
    if (!actualList) {
      try {
        actualList = await AppleScriptRunner.execute(
          `
          tell application "Reminders"
            set theReminder to first reminder whose name is "${text}"
            return name of container of theReminder
          end tell
        `,
          "Reminders",
        );
        actualList = actualList.trim();
      } catch (e) {
        // Fallback
      }
    }

    // Get old state for logging
    let oldDue = "";
    try {
      oldDue = await AppleScriptRunner.execute(
        `
        tell application "Reminders"
          set theReminder to first reminder ${listClause} whose name is "${text}"
          return due date of theReminder as string
        end tell
      `,
        "Reminders",
      );
    } catch (e) {
      // Ignore
    }

    await AppleScriptRunner.execute(
      `
      tell application "Reminders" to delete (first reminder ${listClause} whose name is "${text}")
    `,
      "Reminders",
    );

    // Log the operation
    await this.logger.log(
      "delete",
      "reminders",
      { text },
      { before: { text, due: oldDue }, after: null },
      { confirmed: true, folder: actualList },
    );

    return `Reminder "${text}" deleted successfully.`;
  }

  /**
   * List all reminder lists and their incomplete reminders in a tree structure
   */
  async listTree(): Promise<string> {
    const script = `
      tell application "Reminders"
        set treeList to {}
        set allLists to every list
        repeat with aList in allLists
          set listName to name of aList
          set reminderNames to name of every reminder of aList whose completed is false
          if (count of reminderNames) is 0 then
            copy listName & "/" to end of treeList
          else
            repeat with rName in reminderNames
              copy listName & "/" & rName to end of treeList
            end repeat
          end if
        end repeat
        return treeList
      end tell
    `;
    const result = await AppleScriptRunner.execute(script, "Reminders");
    const paths = AppleScriptRunner.parseList(result);
    // Reuse the folder tree formatter from Notes logic
    const { formatFolderTree } = await import("../utils/formatters.js");
    return formatFolderTree(paths);
  }

  /**
   * List all reminder lists
   */
  async listLists(): Promise<string[]> {
    const result = await AppleScriptRunner.execute(
      `
      tell application "Reminders" to get name of every list
    `,
      "Reminders",
    );
    return AppleScriptRunner.parseList(result);
  }
}
