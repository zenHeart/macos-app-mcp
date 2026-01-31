import { describe, it, expect, vi, beforeEach } from "vitest";
import { Reminders } from "../src/apps/reminders.js";
import { AppleScriptRunner } from "../src/utils/apple-script.js";
import { ConfigManager } from "../src/utils/config.js";
import { OperationLogger } from "../src/utils/logger.js";

// Mock utilities
vi.mock("../src/utils/apple-script.js");
vi.mock("../src/utils/config.js");
vi.mock("../src/utils/logger.js");

describe("Reminders", () => {
  let reminders: Reminders;
  let mockConfig: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    mockConfig = {
      getDefaultRemindersList: vi.fn().mockReturnValue("ai"),
      canDelete: vi.fn().mockReturnValue(true),
      canUpdate: vi.fn().mockReturnValue(true),
    };
    vi.mocked(ConfigManager.getInstance).mockReturnValue(mockConfig);

    mockLogger = {
      log: vi.fn().mockResolvedValue("test-id"),
    };
    vi.mocked(OperationLogger.getInstance).mockReturnValue(mockLogger);

    reminders = new Reminders();
  });

  describe("list", () => {
    it("should list all incomplete reminders when no list specified", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(
        "Remind 1, Remind 2",
      );
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue([
        "Remind 1",
        "Remind 2",
      ]);

      const result = await reminders.list();

      expect(result).toEqual(["Remind 1", "Remind 2"]);
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        'tell application "Reminders" to get name of every reminder  whose completed is false',
        "Reminders",
      );
    });

    it("should list reminders from specific list", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("Work task");
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue(["Work task"]);

      const result = await reminders.list("Work");

      expect(result).toEqual(["Work task"]);
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        'tell application "Reminders" to get name of every reminder of list "Work" whose completed is false',
        "Reminders",
      );
    });
  });

  describe("add", () => {
    it("should add reminder without due date to default list", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("");

      const result = await reminders.add("Buy groceries");

      expect(result).toBe(
        'Reminder "Buy groceries" added successfully to list "ai"',
      );
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.any(String),
        "Reminders",
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "create",
        "reminders",
        { text: "Buy groceries" },
        { after: { text: "Buy groceries", due: undefined } },
        { folder: "ai" },
      );
    });

    it("should add reminder with due date", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("");

      const result = await reminders.add("Submit report", "2023-12-31");

      expect(result).toBe(
        'Reminder "Submit report" added successfully to list "ai"',
      );
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining("due date:"),
        "Reminders",
      );
    });

    it("should add reminder to specific list", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("");

      const result = await reminders.add("Work task", undefined, "Work");

      expect(result).toBe(
        'Reminder "Work task" added successfully to list "Work"',
      );
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('at end of list "Work"'),
        "Reminders",
      );
    });
  });

  describe("complete", () => {
    it("should mark reminder as completed", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("");

      const result = await reminders.complete("Buy groceries");

      expect(result).toBe('Reminder "Buy groceries" marked as completed');
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining("set completed of theReminder to true"),
        "Reminders",
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "update",
        "reminders",
        { text: "Buy groceries" },
        { before: { completed: false }, after: { completed: true } },
        { folder: undefined },
      );
    });
  });

  describe("update", () => {
    it("should update reminder text and log it", async () => {
      vi.mocked(AppleScriptRunner.execute)
        .mockResolvedValueOnce("old due")
        .mockResolvedValueOnce("");

      const result = await reminders.update("Old text", "New text");

      expect(result).toBe('Reminder "Old text" updated successfully');
      expect(mockLogger.log).toHaveBeenCalledWith(
        "update",
        "reminders",
        { text: "Old text" },
        expect.anything(),
        { folder: undefined },
      );
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.any(String),
        "Reminders",
      );
    });

    it("should throw error if update is disabled", async () => {
      mockConfig.canUpdate.mockReturnValue(false);
      await expect(reminders.update("X", "Y")).rejects.toThrow(
        "Update operations are disabled",
      );
    });
  });

  describe("delete", () => {
    it("should delete reminder and log it when confirmation matches", async () => {
      vi.mocked(AppleScriptRunner.execute)
        .mockResolvedValueOnce("MyList") // get list
        .mockResolvedValueOnce("2023-01-01") // get due
        .mockResolvedValueOnce(""); // delete

      const result = await reminders.delete("Buy milk", "Buy milk");

      expect(result).toContain('Reminder "Buy milk" deleted successfully');
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.any(String),
        "Reminders",
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "delete",
        "reminders",
        { text: "Buy milk" },
        expect.anything(),
        { confirmed: true, folder: "MyList" },
      );
    });

    it("should throw error when confirmation does not match", async () => {
      await expect(reminders.delete("Buy milk", "Wrong text")).rejects.toThrow(
        "Deletion cancelled: Confirmation text does not match.",
      );
    });

    it("should throw error if delete is disabled", async () => {
      mockConfig.canDelete.mockReturnValue(false);
      await expect(reminders.delete("X", "X")).rejects.toThrow(
        "Delete operations are disabled",
      );
    });
  });

  describe("listLists", () => {
    it("should return all reminder lists", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(
        "Work, Personal, Shopping",
      );
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue([
        "Work",
        "Personal",
        "Shopping",
      ]);

      const result = await reminders.listLists();

      expect(result).toEqual(["Work", "Personal", "Shopping"]);
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining("get name of every list"),
        "Reminders",
      );
    });

    it("should return empty array when no lists exist", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("");
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue([]);

      const result = await reminders.listLists();

      expect(result).toEqual([]);
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.any(String),
        "Reminders",
      );
    });
  });
});
