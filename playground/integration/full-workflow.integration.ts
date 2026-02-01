/**
 * Full Workflow Integration Tests
 *
 * These tests simulate real user workflows across multiple apps.
 * They help verify that the MCP server works correctly in realistic scenarios.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { Notes } from "../../src/apps/notes.js";
import { Reminders } from "../../src/apps/reminders.js";
import { Calendar } from "../../src/apps/calendar.js";
import { Contacts } from "../../src/apps/contacts.js";

const TEST_PREFIX = "[MCP-TEST]";

describe("Full Workflow Integration Tests", () => {
  let notes: Notes;
  let reminders: Reminders;
  let calendar: Calendar;
  let contacts: Contacts;

  beforeAll(() => {
    process.env.MCP_ALLOW_DELETE = "true";
    process.env.MCP_ALLOW_UPDATE = "true";
    // Use "ai" folder/list for tests (auto-created if not exists)
    process.env.MCP_NOTES_FOLDER = "ai";
    process.env.MCP_REMINDERS_LIST = "ai";

    notes = new Notes();
    reminders = new Reminders();
    calendar = new Calendar();
    contacts = new Contacts();
  });

  describe("Workflow: Meeting Preparation", () => {
    it("should check today's schedule", async () => {
      const events = await calendar.listEvents("today");
      expect(Array.isArray(events)).toBe(true);
    });

    it("should search for meeting notes", async () => {
      const results = await notes.query("meeting");
      expect(Array.isArray(results)).toBe(true);
    });

    it("should add a reminder for meeting prep", async () => {
      const text = `${TEST_PREFIX} Prepare for meeting ${Date.now()}`;
      const result = await reminders.add(text);

      expect(result).toContain("added");

      // Cleanup
      await reminders.delete(text, text, "ai");
    });
  });

  describe("Workflow: Project Task Tracking", () => {
    it("should create a project note and related reminders", async () => {
      const projectName = `${TEST_PREFIX} Project ${Date.now()}`;

      // Create project note in ai folder
      const noteResult = await notes.create(
        projectName,
        "# Project Status\n\n- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3",
      );
      expect(noteResult).toContain("created");

      // Create related reminder in ai list
      const reminderResult = await reminders.add(`Review ${projectName}`);
      expect(reminderResult).toContain("added");

      // Cleanup
      await notes.delete(projectName, projectName, "ai");
      await reminders.delete(
        `Review ${projectName}`,
        `Review ${projectName}`,
        "ai",
      );
    });
  });

  // Contacts tests are skipped because Contacts app may not be running
  // and requires special permissions
  describe("Workflow: Contact Lookup", () => {
    it.skip("should list contacts", async () => {
      const contactList = await contacts.list(5);
      expect(Array.isArray(contactList)).toBe(true);
      console.log("Sample contacts:", contactList.slice(0, 3));
    });

    it.skip("should handle contact search for existing contact", async () => {
      // First get a real contact name to search for
      const contactList = await contacts.list(1);
      if (contactList.length > 0) {
        const searchName = contactList[0].split(" ")[0]; // Use first name
        try {
          const result = await contacts.search(searchName);
          expect(typeof result).toBe("string");
        } catch (e) {
          console.log(
            "Contact search returned error (expected for some cases)",
          );
        }
      }
    });
  });

  describe("Workflow: App State Verification", () => {
    it("should verify all apps are accessible", async () => {
      // Notes
      const folders = await notes.listFolders();
      expect(folders).toBeDefined();

      // Reminders
      const lists = await reminders.listLists();
      expect(lists.length).toBeGreaterThan(0);

      // Calendar
      const calendars = await calendar.listCalendars();
      expect(calendars.length).toBeGreaterThan(0);

      // Contacts - try but don't fail if not available
      try {
        const contactList = await contacts.list(1);
        expect(Array.isArray(contactList)).toBe(true);
      } catch (e) {
        // Contacts app may not be running
      }
    });
  });
});
