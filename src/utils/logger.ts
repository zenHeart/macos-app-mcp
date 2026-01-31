import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { ConfigManager, OperationLog } from "./config.js";

/**
 * Operation Logger
 * Records all write operations for audit and recovery
 */
export class OperationLogger {
  private static instance: OperationLogger;
  private config: ConfigManager;

  private constructor() {
    this.config = ConfigManager.getInstance();
    this.ensureLogDirectory();
  }

  static getInstance(): OperationLogger {
    if (!OperationLogger.instance) {
      OperationLogger.instance = new OperationLogger();
    }
    return OperationLogger.instance;
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    const logPath = this.config.getLogPath();
    const dir = path.dirname(logPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Log an operation
   */
  async log(
    operation: "create" | "update" | "delete",
    app: "notes" | "reminders" | "calendar" | "contacts",
    target: OperationLog["target"],
    data: OperationLog["data"],
    metadata: Partial<OperationLog["metadata"]> = {},
  ): Promise<string> {
    if (!this.config.isLoggingEnabled()) {
      return ""; // Logging disabled
    }

    const entry: OperationLog = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      operation,
      app,
      target,
      data,
      metadata: {
        confirmed: metadata.confirmed ?? false,
        folder: metadata.folder,
        user: metadata.user ?? process.env.USER,
      },
    };

    try {
      const logPath = this.config.getLogPath();
      const logLine = JSON.stringify(entry) + "\n";

      // Append to log file
      fs.appendFileSync(logPath, logLine, "utf-8");

      // Check log file size and rotate if needed
      await this.rotateLogIfNeeded();

      return entry.id;
    } catch (error) {
      console.error(`[Logger] Failed to log operation: ${error}`);
      return "";
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  private async rotateLogIfNeeded(): Promise<void> {
    const logPath = this.config.getLogPath();
    const maxSizeMB = this.config.getMaxLogSize();
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    try {
      const stats = fs.statSync(logPath);

      if (stats.size > maxSizeBytes) {
        // Rotate: rename current log to .old
        const oldLogPath = `${logPath}.old`;
        if (fs.existsSync(oldLogPath)) {
          fs.unlinkSync(oldLogPath); // Remove old backup
        }
        fs.renameSync(logPath, oldLogPath);

        console.log(`[Logger] Rotated log file (size: ${stats.size} bytes)`);
      }
    } catch (error) {
      // Log file doesn't exist yet, ignore
    }
  }

  /**
   * Read all operation logs
   */
  async readLogs(options?: {
    limit?: number;
    operation?: "create" | "update" | "delete";
    app?: "notes" | "reminders" | "calendar" | "contacts";
    since?: Date;
  }): Promise<OperationLog[]> {
    const logPath = this.config.getLogPath();

    if (!fs.existsSync(logPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(logPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      let logs: OperationLog[] = lines
        .map((line) => {
          try {
            return JSON.parse(line) as OperationLog;
          } catch {
            return null;
          }
        })
        .filter((log): log is OperationLog => log !== null);

      // Apply filters
      if (options?.operation) {
        logs = logs.filter((log) => log.operation === options.operation);
      }

      if (options?.app) {
        logs = logs.filter((log) => log.app === options.app);
      }

      if (options?.since) {
        const sinceTime = options.since.getTime();
        logs = logs.filter(
          (log) => new Date(log.timestamp).getTime() >= sinceTime,
        );
      }

      // Sort by timestamp (newest first)
      logs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      // Apply limit
      if (options?.limit) {
        logs = logs.slice(0, options.limit);
      }

      return logs;
    } catch (error) {
      console.error(`[Logger] Failed to read logs: ${error}`);
      return [];
    }
  }

  /**
   * Get operation by ID
   */
  async getOperation(id: string): Promise<OperationLog | null> {
    const logs = await this.readLogs();
    // Support full UUID or truncated ID (prefix)
    return (
      logs.find(
        (log) => log.id === id || (id.length >= 8 && log.id.startsWith(id)),
      ) || null
    );
  }

  /**
   * Get recent operations
   */
  async getRecentOperations(limit: number = 10): Promise<OperationLog[]> {
    return this.readLogs({ limit });
  }

  /**
   * Get operations by app
   */
  async getOperationsByApp(
    app: "notes" | "reminders" | "calendar" | "contacts",
    limit?: number,
  ): Promise<OperationLog[]> {
    return this.readLogs({ app, limit });
  }

  /**
   * Clean up old logs based on retention policy
   */
  async cleanupOldLogs(): Promise<number> {
    const retentionDays = this.config.getRetentionDays();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const allLogs = await this.readLogs();
    const logsToKeep = allLogs.filter(
      (log) => new Date(log.timestamp) >= cutoffDate,
    );

    const removedCount = allLogs.length - logsToKeep.length;

    if (removedCount > 0) {
      // Rewrite log file with only logs to keep
      const logPath = this.config.getLogPath();
      const content = logsToKeep.map((log) => JSON.stringify(log)).join("\n");

      fs.writeFileSync(logPath, content + "\n", "utf-8");

      console.log(`[Logger] Cleaned up ${removedCount} old log entries`);
    }

    return removedCount;
  }
}
