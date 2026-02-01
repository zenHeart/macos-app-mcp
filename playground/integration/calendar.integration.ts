/**
 * Integration Tests for Calendar
 *
 * ⚠️ WARNING: These tests interact with REAL macOS Calendar app!
 * - Tests will create/delete calendar events
 * - Test items are prefixed with [MCP-TEST] for identification
 * - Tests attempt cleanup, but failures may leave test data
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Calendar } from "../../src/apps/calendar.js";

// Test data prefix for easy identification and cleanup
const TEST_PREFIX = "[MCP-TEST]";

describe("Calendar Integration Tests", () => {
  let calendar: Calendar;
  let createdEvents: Array<{ summary: string; startDate: string }> = [];
  let defaultCalendar: string;

  beforeAll(async () => {
    // Enable all operations for testing
    process.env.MCP_ALLOW_DELETE = "true";
    process.env.MCP_ALLOW_UPDATE = "true";
    calendar = new Calendar();

    // Get first available calendar as default
    const calendars = await calendar.listCalendars();
    defaultCalendar = calendars[0] || "Calendar";
  });

  afterAll(async () => {
    // Cleanup: Delete all test events
    for (const event of createdEvents) {
      try {
        await calendar.deleteEvent(
          event.summary,
          event.startDate,
          event.summary,
        );
      } catch (e) {
        // Cleanup failures are expected sometimes
      }
    }
  });

  describe("Calendar Operations", () => {
    it("should list all calendars", async () => {
      const calendars = await calendar.listCalendars();

      expect(Array.isArray(calendars)).toBe(true);
      expect(calendars.length).toBeGreaterThan(0);
    });

    it("should list events for today", async () => {
      const events = await calendar.listEvents("today");

      expect(Array.isArray(events)).toBe(true);
    });

    it("should list events for specific date", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];

      const events = await calendar.listEvents(dateStr);

      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe("Event CRUD Operations", () => {
    it("should create a new event", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];

      const summary = `${TEST_PREFIX} Test Event ${Date.now()}`;
      const startDate = `${dateStr} 14:00`;
      const endDate = `${dateStr} 15:00`;

      const result = await calendar.createEvent(
        summary,
        startDate,
        endDate,
        defaultCalendar,
        "Test Location",
      );
      createdEvents.push({ summary, startDate });

      expect(result).toContain("created");
    });

    it("should find created event in calendar", async () => {
      // Create an event for today to easily verify
      const today = new Date().toISOString().split("T")[0];
      const summary = `${TEST_PREFIX} Today Event ${Date.now()}`;
      const startDate = `${today} 16:00`;
      const endDate = `${today} 17:00`;

      await calendar.createEvent(summary, startDate, endDate, defaultCalendar);
      createdEvents.push({ summary, startDate });

      // List today's events
      const events = await calendar.listEvents("today");
      const hasTestEvent = events.some((e) => e.includes(TEST_PREFIX));

      expect(hasTestEvent).toBe(true);
    });

    it("should delete event with confirmation", async () => {
      const today = new Date().toISOString().split("T")[0];
      const summary = `${TEST_PREFIX} To Delete ${Date.now()}`;
      const startDate = `${today} 18:00`;
      const endDate = `${today} 19:00`;

      await calendar.createEvent(summary, startDate, endDate, defaultCalendar);

      const result = await calendar.deleteEvent(summary, startDate, summary);
      expect(result).toContain("deleted");
    });
  });

  describe("Error Handling", () => {
    it("should reject delete without matching confirmation", async () => {
      const today = new Date().toISOString().split("T")[0];
      const summary = `${TEST_PREFIX} Confirm Test ${Date.now()}`;
      const startDate = `${today} 20:00`;
      const endDate = `${today} 21:00`;

      await calendar.createEvent(summary, startDate, endDate, defaultCalendar);
      createdEvents.push({ summary, startDate });

      await expect(
        calendar.deleteEvent(summary, startDate, "wrong"),
      ).rejects.toThrow(/confirmation/i);
    });
  });
});
