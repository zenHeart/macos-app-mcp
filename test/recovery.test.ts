import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecoveryManager } from "../src/utils/recovery.js";
import { OperationLogger } from "../src/utils/logger.js";
import { AppleScriptRunner } from "../src/utils/apple-script.js";
import { Notes } from "../src/apps/notes.js";
import { Reminders } from "../src/apps/reminders.js";
import { Calendar } from "../src/apps/calendar.js";

vi.mock("../src/utils/logger.js");
vi.mock("../src/utils/apple-script.js");
vi.mock("../src/apps/notes.js");
vi.mock("../src/apps/reminders.js");
vi.mock("../src/apps/calendar.js");

describe("RecoveryManager", () => {
  let recovery: RecoveryManager;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      readLogs: vi.fn(),
      getOperation: vi.fn(),
      log: vi.fn(),
    };
    vi.mocked(OperationLogger.getInstance).mockReturnValue(mockLogger);
    (RecoveryManager as any).instance = undefined;
    recovery = RecoveryManager.getInstance();
  });

  describe("listRecoverableOperations", () => {
    it("should filter for operations that have 'before' data", async () => {
      const logs = [
        {
          id: "1",
          operation: "delete",
          data: { before: "content" },
          app: "notes",
          metadata: {},
        },
        {
          id: "2",
          operation: "create",
          data: { after: "content" },
          app: "notes",
          metadata: {},
        },
      ];
      mockLogger.readLogs.mockResolvedValue(logs);

      const result = await recovery.listRecoverableOperations();

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("1");
    });
  });

  describe("recover - Notes", () => {
    const operation = {
      id: "test-id",
      app: "notes",
      operation: "delete",
      target: { title: "My Note" },
      data: { before: "old content" },
      metadata: { folder: "Work" },
    };

    it("should fail if confirmId doesn't match", async () => {
      const result = await recovery.recover("test-id", "wrong-id");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Confirmation ID");
    });

    it("should try native recovery first for notes", async () => {
      mockLogger.getOperation.mockResolvedValue(operation);
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("native_success");

      const result = await recovery.recover("test-id", "test-id");

      expect(result.success).toBe(true);
      expect(result.message).toContain("recovered natively");
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('folder "Recently Deleted"'),
      );
      // Fallback should NOT be called
      expect(vi.mocked(Notes).prototype.create).not.toHaveBeenCalled();
    });

    it("should fallback to recreation if native recovery fails", async () => {
      mockLogger.getOperation.mockResolvedValue(operation);
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("no_note_found");

      const result = await recovery.recover("test-id", "test-id");

      expect(result.success).toBe(true);
      // Falling back to Notes.create()
      expect(Notes.prototype.create).toHaveBeenCalledWith(
        "My Note",
        "old content",
        "Work",
        { skipLog: true },
      );
    });
  });

  describe("recover - Reminders", () => {
    const operation = {
      id: "rem-id",
      app: "reminders",
      operation: "delete",
      target: { text: "Fix bug" },
      data: { before: { text: "Fix bug", due: null } },
      metadata: { folder: "Tasks" },
    };

    it("should try native recovery for reminders", async () => {
      mockLogger.getOperation.mockResolvedValue(operation);
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("native_success");

      const result = await recovery.recover("rem-id", "rem-id");

      expect(result.success).toBe(true);
      expect(result.message).toContain("recovered natively");
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining("completed of theReminder to false"),
      );
    });

    it("should fallback to recreation for reminders", async () => {
      mockLogger.getOperation.mockResolvedValue(operation);
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("no_match");

      const result = await recovery.recover("rem-id", "rem-id");

      expect(result.success).toBe(true);
      expect(Reminders.prototype.add).toHaveBeenCalledWith(
        "Fix bug",
        undefined,
        "Tasks",
      );
    });
  });
});
