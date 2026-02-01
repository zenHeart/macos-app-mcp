import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * Operation log entry
 */
export interface OperationLog {
  id: string; // Unique operation ID (UUID)
  timestamp: string; // ISO 8601 timestamp
  operation: "create" | "update" | "delete"; // Operation type
  app: "notes" | "reminders" | "calendar" | "contacts"; // Target app
  target: {
    // Target identifier
    title?: string; // For notes
    text?: string; // For reminders
    summary?: string; // For calendar events
    name?: string; // For contacts
  };
  data: {
    // Operation data for recovery
    before?: any; // State before operation
    after?: any; // State after operation
  };
  metadata: {
    // Additional metadata
    folder?: string; // Notes folder or Reminders list
    confirmed: boolean; // Whether operation was confirmed
    user?: string; // User who performed operation
  };
}

/**
 * Environment-based Configuration
 * All settings are read from environment variables
 */
export class ConfigManager {
  private static instance: ConfigManager;

  private constructor() {
    this.ensureLogDirectory();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    const logPath = this.getLogPath();
    const dir = path.dirname(logPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Get default folder for notes (from env or default "ai")
   */
  getDefaultNotesFolder(): string {
    return process.env.MCP_NOTES_FOLDER || "ai";
  }

  /**
   * Get default list for reminders (from env or default "ai")
   */
  getDefaultRemindersList(): string {
    return process.env.MCP_REMINDERS_LIST || "ai";
  }

  /**
   * Get default calendar (from env or system default)
   */
  getDefaultCalendar(): string | undefined {
    return process.env.MCP_CALENDAR || undefined;
  }

  /**
   * Check if delete operations are allowed (from env or default false)
   */
  canDelete(): boolean {
    return process.env.MCP_ALLOW_DELETE === "true";
  }

  /**
   * Check if update operations are allowed (from env or default false)
   */
  canUpdate(): boolean {
    return process.env.MCP_ALLOW_UPDATE === "true";
  }

  /**
   * Check if logging is enabled (from env or default true)
   */
  isLoggingEnabled(): boolean {
    return process.env.MCP_LOGGING_ENABLED !== "false";
  }

  /**
   * Get log file path (from env or default ~/.macos-mcp/operations.log)
   */
  getLogPath(): string {
    return (
      process.env.MCP_LOG_PATH ||
      path.join(os.homedir(), ".macos-mcp", "operations.log")
    );
  }

  /**
   * Get max log size in MB (from env or default 10)
   */
  getMaxLogSize(): number {
    return parseInt(process.env.MCP_LOG_MAX_SIZE || "10", 10);
  }

  /**
   * Get log retention days (from env or default 30)
   */
  getRetentionDays(): number {
    return parseInt(process.env.MCP_LOG_RETENTION_DAYS || "30", 10);
  }
}
