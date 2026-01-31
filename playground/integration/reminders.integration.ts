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

// Utility to add timeout to a promise
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
    ),
  ]);
};

describe("Reminders Integration Tests", () => {
  let reminders: Reminders;
  let createdReminders: Array<{ text: string; list?: string }> = [];
  let defaultList: string;
  // Use unique suffix for this test run
  const testSuffix = Date.now();

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
    // Cleanup with 5-second timeout per item, max 30 seconds total
    console.log(`Cleaning up ${createdReminders.length} test reminders...`);
    const startTime = Date.now();
    const maxCleanupTime = 30000; // 30 seconds max

    for (const item of createdReminders) {
      if (Date.now() - startTime > maxCleanupTime) {
        console.warn("Cleanup timeout reached, skipping remaining items");
        break;
      }
      try {
        await withTimeout(
          reminders.delete(item.text, item.text, item.list),
          5000,
        );
        console.log(`Cleaned up: ${item.text}`);
      } catch (e) {
        console.warn(`Failed to clean up: ${item.text}`);
      }
    }
    console.log("Cleanup completed");
  }, 60000); // 60 second timeout for afterAll

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
      const text = `${TEST_PREFIX} Simple ${testSuffix}`;
      const result = await reminders.add(text, undefined, defaultList);
      createdReminders.push({ text, list: defaultList });

      expect(result).toContain("added successfully");
      console.log("Create result:", result);
    });

    it("should create reminder with due date", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueDate = tomorrow.toISOString().split("T")[0] + " 10:00";

      const text = `${TEST_PREFIX} DueTomorrow ${testSuffix}`;
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
      const tempText = `${TEST_PREFIX} ToComplete ${testSuffix}`;
      await reminders.add(tempText, undefined, defaultList);
      // Don't add to cleanup - completed reminders won't show in incomplete list

      const result = await reminders.complete(tempText, defaultList);
      expect(result).toContain("completed");
    });

    it("should delete reminder with confirmation", async () => {
      // Create a reminder to delete
      const toDelete = `${TEST_PREFIX} ToDelete ${testSuffix}`;
      await reminders.add(toDelete, undefined, defaultList);

      const result = await reminders.delete(toDelete, toDelete, defaultList);
      expect(result).toContain("deleted");
    });
  });

  describe("Error Handling", () => {
    it("should reject delete without matching confirmation", async () => {
      const tempText = `${TEST_PREFIX} ConfirmTest ${testSuffix}`;
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
