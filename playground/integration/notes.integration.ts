/**
 * Integration Tests for Notes
 *
 * ⚠️ WARNING: These tests interact with REAL macOS Notes app!
 * - Tests will create/modify/delete notes
 * - Test items are prefixed with [MCP-TEST] for identification
 * - Tests attempt cleanup, but failures may leave test data
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Notes } from "../../src/apps/notes.js";

// Test data prefix for easy identification and cleanup
const TEST_PREFIX = "[MCP-TEST]";
const TEST_NOTE_TITLE = `${TEST_PREFIX} Integration Test Note`;
const TEST_NOTE_CONTENT =
  "This is a test note created by MCP integration tests.";

describe("Notes Integration Tests", () => {
  let notes: Notes;
  let createdNotes: string[] = [];

  beforeAll(() => {
    // Enable all operations for testing
    process.env.MCP_ALLOW_DELETE = "true";
    process.env.MCP_ALLOW_UPDATE = "true";
    // Use the default "Notes" folder which always exists on macOS
    process.env.MCP_NOTES_FOLDER = "Notes";
    notes = new Notes();
  });

  afterAll(async () => {
    // Cleanup: Delete all test notes
    for (const title of createdNotes) {
      try {
        await notes.delete(title, title);
        console.log(`Cleaned up: ${title}`);
      } catch (e) {
        console.warn(`Failed to clean up: ${title}`);
      }
    }
  });

  describe("Folder Operations", () => {
    it("should list all folders", async () => {
      const result = await notes.listFolders();

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      // Should have at least the default "Notes" folder
      console.log("Available folders:", result);
    });
  });

  describe("Note CRUD Operations", () => {
    it("should create a new note", async () => {
      const result = await notes.create(TEST_NOTE_TITLE, TEST_NOTE_CONTENT);
      createdNotes.push(TEST_NOTE_TITLE);

      expect(result).toContain("created successfully");
      console.log("Create result:", result);
    });

    it("should find the created note via query", async () => {
      const results = await notes.query(TEST_PREFIX);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.includes(TEST_NOTE_TITLE))).toBe(true);
      console.log("Query results:", results);
    });

    it("should read note content", async () => {
      const content = await notes.get(TEST_NOTE_TITLE);

      expect(content).toContain(TEST_NOTE_CONTENT);
      console.log("Note content length:", content.length);
    });

    it("should update note content", async () => {
      const newContent =
        TEST_NOTE_CONTENT + "\n\nUpdated at: " + new Date().toISOString();
      const result = await notes.update(TEST_NOTE_TITLE, newContent);

      expect(result).toContain("updated");

      // Verify update
      const content = await notes.get(TEST_NOTE_TITLE);
      expect(content).toContain("Updated at:");
    });

    it("should delete note with confirmation", async () => {
      const result = await notes.delete(TEST_NOTE_TITLE, TEST_NOTE_TITLE);

      expect(result).toContain("deleted");
      // Remove from cleanup list since already deleted
      createdNotes = createdNotes.filter((t) => t !== TEST_NOTE_TITLE);
    });
  });

  describe("Error Handling", () => {
    it("should reject delete without matching confirmation", async () => {
      // First create a note
      const tempTitle = `${TEST_PREFIX} Temp Note ${Date.now()}`;
      await notes.create(tempTitle, "Temp content");
      createdNotes.push(tempTitle);

      await expect(
        notes.delete(tempTitle, "wrong confirmation"),
      ).rejects.toThrow(/confirmation/i);

      // Cleanup
      await notes.delete(tempTitle, tempTitle);
      createdNotes = createdNotes.filter((t) => t !== tempTitle);
    });

    it("should handle non-existent note gracefully", async () => {
      await expect(notes.get("NonExistentNote_12345_xyz")).rejects.toThrow();
    });
  });
});
