/**
 * Integration Tests for Notes
 *
 * ⚠️ WARNING: These tests interact with REAL macOS Notes app!
 * - Tests will create notes (update/delete operations are unreliable via AppleScript)
 * - Test items are prefixed with "MCP-TEST-" for identification
 * - Tests attempt cleanup, but failures may leave test data
 *
 * ⚠️ KNOWN LIMITATION:
 * macOS Notes app has limitations with AppleScript integration:
 * - Notes created via AppleScript may not be immediately findable
 * - The "first note whose name contains/is" query often fails with -1719 error
 * - This seems related to iCloud sync and internal indexing delays
 * - As a result, update and delete operations are marked as skip
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Notes } from "../../src/apps/notes.js";

// Test data prefix for easy identification and cleanup
// Avoid special characters that might confuse AppleScript
const TEST_PREFIX = "MCP-TEST-";

// Utility function to wait for Notes app to sync
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Notes Integration Tests", () => {
  let notes: Notes;
  let createdNotes: string[] = [];
  // Use unique title for each test run to avoid conflicts
  let testNoteTitle: string;

  beforeAll(() => {
    // Enable all operations for testing
    process.env.MCP_ALLOW_DELETE = "true";
    process.env.MCP_ALLOW_UPDATE = "true";
    // Use "ai" folder for tests (it will be auto-created if not exists)
    process.env.MCP_NOTES_FOLDER = "ai";
    notes = new Notes();
    // Generate unique title for this test run
    testNoteTitle = `${TEST_PREFIX}Note ${Date.now()}`;
  });

  afterAll(async () => {
    // Cleanup: Try to delete test notes (may fail due to Notes app limitations)
    const cleanupTimeout = 5000;
    for (const title of createdNotes) {
      try {
        const deletePromise = notes.delete(title, title, "ai");
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Cleanup timeout")),
            cleanupTimeout,
          ),
        );
        await Promise.race([deletePromise, timeoutPromise]);
      } catch (e) {
        // Expected to fail often due to Notes app limitations
      }
    }
  }, 120000); // 2 minute timeout for afterAll

  describe("Folder Operations", () => {
    it("should list all folders", async () => {
      const result = await notes.listFolders();

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      // Should have content (at least "Notes" folder exists)
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Note CRUD Operations", () => {
    it("should create a new note", async () => {
      const content = "This is a test note created by MCP integration tests.";
      const result = await notes.create(testNoteTitle, content);
      createdNotes.push(testNoteTitle);

      expect(result).toContain("created successfully");

      // Wait for Notes app to possibly index the new note
      await wait(3000);
    });

    it("should find the created note via query", async () => {
      // Query is more reliable than direct note reference
      const results = await notes.query(TEST_PREFIX);

      // Should find at least one test note
      expect(results.length).toBeGreaterThan(0);
    });

    // NOTE: The following tests are skipped due to macOS Notes app limitations
    // The AppleScript "first note whose name contains/is" query often fails
    // with error -1719 (Invalid index) for newly created notes.

    it.skip("should read note content", async () => {
      // This test is skipped due to Notes app indexing limitations
      const content = await notes.get(testNoteTitle);
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
      console.log("Note content:", content.substring(0, 100));
    });

    it.skip("should update note content", async () => {
      // This test is skipped due to Notes app indexing limitations
      const newContent = "Updated content at: " + new Date().toISOString();
      const result = await notes.update(testNoteTitle, newContent);
      expect(result).toContain("updated");
    });

    it.skip("should delete note with confirmation", async () => {
      // This test is skipped due to Notes app indexing limitations
      const result = await notes.delete(testNoteTitle, testNoteTitle);
      expect(result).toContain("deleted");
      createdNotes = createdNotes.filter((t) => t !== testNoteTitle);
    });
  });

  describe("Error Handling", () => {
    it.skip("should reject delete without matching confirmation", async () => {
      // This test is skipped due to Notes app indexing limitations
      const tempTitle = `${TEST_PREFIX}Confirm ${Date.now()}`;
      await notes.create(tempTitle, "Temp content");
      createdNotes.push(tempTitle);

      await wait(1000);

      await expect(
        notes.delete(tempTitle, "wrong confirmation"),
      ).rejects.toThrow(/confirmation/i);

      await notes.delete(tempTitle, tempTitle);
      createdNotes = createdNotes.filter((t) => t !== tempTitle);
    });

    it("should handle non-existent note gracefully", async () => {
      // Enable silent mode for expected errors
      process.env.MCP_SILENT_EXPECTED_ERRORS = "true";
      try {
        await expect(notes.get("NonExistentNote_12345_xyz")).rejects.toThrow();
      } finally {
        delete process.env.MCP_SILENT_EXPECTED_ERRORS;
      }
    });
  });
});
