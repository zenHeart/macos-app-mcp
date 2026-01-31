import { describe, it, expect, vi, beforeEach } from "vitest";
import { Calendar } from "../src/apps/calendar.js";
import { AppleScriptRunner } from "../src/utils/apple-script.js";
import { ConfigManager } from "../src/utils/config.js";
import { OperationLogger } from "../src/utils/logger.js";

// Mock utilities
vi.mock("../src/utils/apple-script.js");
vi.mock("../src/utils/config.js");
vi.mock("../src/utils/logger.js");

describe("Calendar", () => {
  let calendar: Calendar;
  let mockConfig: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    mockConfig = {
      getDefaultCalendar: vi.fn().mockReturnValue(undefined),
      canDelete: vi.fn().mockReturnValue(true),
    };
    vi.mocked(ConfigManager.getInstance).mockReturnValue(mockConfig);

    mockLogger = {
      log: vi.fn().mockResolvedValue("test-id"),
    };
    vi.mocked(OperationLogger.getInstance).mockReturnValue(mockLogger);

    calendar = new Calendar();
  });

  describe("listEvents", () => {
    it("should list events for a specific date", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(
        "Meeting (Monday, January 1, 2024 at 10:00:00 AM), Lunch (Monday, January 1, 2024 at 12:00:00 PM)",
      );
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue([
        "Meeting (Monday, January 1, 2024 at 10:00:00 AM)",
        "Lunch (Monday, January 1, 2024 at 12:00:00 PM)",
      ]);

      const result = await calendar.listEvents("2024-01-01");

      expect(result).toHaveLength(2);
      expect(result[0]).toContain("Meeting");
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining("set theDate to"),
        "Calendar",
      );
    });
  });

  describe("createEvent", () => {
    it("should create a new event with summary, start and end dates", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("");

      const result = await calendar.createEvent(
        "Meeting",
        "2024-01-01 10:00",
        "2024-01-01 11:00",
      );

      expect(result).toBe(
        'Event "Meeting" created successfully for 2024-01-01 10:00',
      );
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.any(String),
        "Calendar",
      );
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it("should create event in specific calendar", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("");

      await calendar.createEvent(
        "Work",
        "2024-01-01 09:00",
        "2024-01-01 17:00",
        "WorkCalendar",
      );

      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('in calendar "WorkCalendar"'),
        "Calendar",
      );
    });
  });

  describe("deleteEvent", () => {
    it("should delete event when confirmation matches", async () => {
      vi.mocked(AppleScriptRunner.execute)
        .mockResolvedValueOnce("Meeting, 2024-01-01, 2024-01-01, Work, Home") // details
        .mockResolvedValueOnce(""); // delete

      const result = await calendar.deleteEvent(
        "Meeting",
        "2024-01-01 10:00",
        "Meeting",
      );

      expect(result).toBe(
        'Event "Meeting" on 2024-01-01 10:00 deleted successfully',
      );
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.any(String),
        "Calendar",
      );
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it("should throw error when confirmation does not match", async () => {
      await expect(
        calendar.deleteEvent("Meeting", "2024-01-01 10:00", "Wrong"),
      ).rejects.toThrow("Deletion cancelled");
    });

    it("should throw error if delete is disabled", async () => {
      mockConfig.canDelete.mockReturnValue(false);
      await expect(calendar.deleteEvent("X", "X", "X")).rejects.toThrow(
        "Delete operations are disabled",
      );
    });
  });

  describe("listCalendars", () => {
    it("should return list of all calendars", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(
        "Work, Personal, Birthdays",
      );
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue([
        "Work",
        "Personal",
        "Birthdays",
      ]);

      const result = await calendar.listCalendars();

      expect(result).toEqual(["Work", "Personal", "Birthdays"]);
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining("get name of every calendar"),
        "Calendar",
      );
    });
  });
});
