/**
 * Integration Tests for Reminders
 *
 * ⚠️ WARNING: These tests interact with REAL macOS Reminders app!
 * - Tests will create/modify/delete reminders
 * - Test items are prefixed with [MCP-TEST] for identification
 * - Tests attempt cleanup, but failures may leave test data
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Reminders } from "../../src/apps/reminders.js";

// Test data prefix for easy identification and cleanup
const TEST_PREFIX = "[MCP-TEST]";
const TEST_REMINDER_TEXT = `${TEST_PREFIX} Integration Test Reminder`;

describe("Reminders Integration Tests", () => {
  let reminders: Reminders;
  let createdReminders: Array<{ text: string; list?: string }> = [];
  let defaultList: string;

  beforeAll(async () => {
    // Enable all operations for testing
    process.env.MCP_ALLOW_DELETE = "true";
    process.env.MCP_ALLOW_UPDATE = "true";
    reminders = new Reminders();

    // Get first available list as default
    const lists = await reminders.listLists();
    defaultList = lists[0] || "Reminders";
    console.log("Using default list:", defaultList);
  });

  afterAll(async () => {
    // Cleanup: Delete all test reminders
    for (const item of createdReminders) {
      try {
        await reminders.delete(item.text, item.text, item.list);
        console.log(`Cleaned up: ${item.text}`);
      } catch (e) {
        console.warn(`Failed to clean up: ${item.text}`);
      }
    }
  });

  describe("List Operations", () => {
    it("should list all reminder lists", async () => {
      const lists = await reminders.listLists();

      expect(Array.isArray(lists)).toBe(true);
      expect(lists.length).toBeGreaterThan(0);
      console.log("Available lists:", lists);
    });

    it("should list all reminders as tree", async () => {
      const tree = await reminders.listTree();

      expect(typeof tree).toBe("string");
      console.log("Reminders tree preview:", tree.substring(0, 500));
    });
  });

  describe("Reminder CRUD Operations", () => {
    it("should create a simple reminder", async () => {
      const result = await reminders.add(
        TEST_REMINDER_TEXT,
        undefined,
        defaultList,
      );
      createdReminders.push({ text: TEST_REMINDER_TEXT, list: defaultList });

      expect(result).toContain("added successfully");
      console.log("Create result:", result);
    });

    it("should create reminder with due date", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueDate = tomorrow.toISOString().split("T")[0] + " 10:00";

      const text = `${TEST_PREFIX} Due Tomorrow ${Date.now()}`;
      const result = await reminders.add(text, dueDate, defaultList);
      createdReminders.push({ text, list: defaultList });

      expect(result).toContain("added successfully");
      console.log("Created reminder with due date:", dueDate);
    });

    it("should find created reminders in list", async () => {
      const results = await reminders.list(defaultList);

      const hasTestReminder = results.some((r) => r.includes(TEST_PREFIX));
      expect(hasTestReminder).toBe(true);
      console.log(
        "Reminders in list:",
        results.filter((r) => r.includes(TEST_PREFIX)),
      );
    });

    it("should complete a reminder", async () => {
      // Create a temporary reminder to complete
      const tempText = `${TEST_PREFIX} To Complete ${Date.now()}`;
      await reminders.add(tempText, undefined, defaultList);

      const result = await reminders.complete(tempText, defaultList);
      expect(result).toContain("completed");

      // No need to add to cleanup as completed reminders are still there
      // but won't show in incomplete list
    });

    it("should update a reminder", async () => {
      // Create a reminder to update
      const oldText = `${TEST_PREFIX} Old Text ${Date.now()}`;
      await reminders.add(oldText, undefined, defaultList);
      createdReminders.push({ text: oldText, list: defaultList });

      // Update it
      const newText = `${TEST_PREFIX} Updated Text ${Date.now()}`;
      const result = await reminders.update(
        oldText,
        newText,
        undefined,
        defaultList,
      );

      expect(result).toContain("updated");

      // Update tracking
      createdReminders = createdReminders.filter((r) => r.text !== oldText);
      createdReminders.push({ text: newText, list: defaultList });
    });

    it("should delete reminder with confirmation", async () => {
      // Create a reminder to delete
      const toDelete = `${TEST_PREFIX} To Delete ${Date.now()}`;
      await reminders.add(toDelete, undefined, defaultList);

      const result = await reminders.delete(toDelete, toDelete, defaultList);
      expect(result).toContain("deleted");
    });
  });

  describe("Error Handling", () => {
    it("should reject delete without matching confirmation", async () => {
      const tempText = `${TEST_PREFIX} Confirm Test ${Date.now()}`;
      await reminders.add(tempText, undefined, defaultList);
      createdReminders.push({ text: tempText, list: defaultList });

      await expect(
        reminders.delete(tempText, "wrong", defaultList),
      ).rejects.toThrow(/confirmation/i);
    });

    it("should handle non-existent list gracefully", async () => {
      await expect(reminders.list("NonExistentList_xyz_123")).rejects.toThrow();
    });
  });
});
