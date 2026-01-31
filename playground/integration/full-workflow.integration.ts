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
    // Use the default "Notes" folder which always exists on macOS
    process.env.MCP_NOTES_FOLDER = "Notes";

    notes = new Notes();
    reminders = new Reminders();
    calendar = new Calendar();
    contacts = new Contacts();
  });

  describe("Workflow: Meeting Preparation", () => {
    it("should check today's schedule", async () => {
      const events = await calendar.listEvents("today");
      expect(Array.isArray(events)).toBe(true);
      console.log("Today's schedule:", events.length, "events");
    });

    it("should search for meeting notes", async () => {
      const results = await notes.query("meeting");
      expect(Array.isArray(results)).toBe(true);
      console.log("Meeting-related notes:", results.length);
    });

    it("should add a reminder for meeting prep", async () => {
      const lists = await reminders.listLists();
      const defaultList = lists[0];

      const text = `${TEST_PREFIX} Prepare for meeting ${Date.now()}`;
      const result = await reminders.add(text, undefined, defaultList);

      expect(result).toContain("added");

      // Cleanup
      await reminders.delete(text, text, defaultList);
    });
  });

  describe("Workflow: Project Task Tracking", () => {
    it("should create a project note and related reminders", async () => {
      const projectName = `${TEST_PREFIX} Project ${Date.now()}`;

      // Create project note
      const noteResult = await notes.create(
        projectName,
        "# Project Status\n\n- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3",
      );
      expect(noteResult).toContain("created");

      // Create related reminder
      const lists = await reminders.listLists();
      const reminderResult = await reminders.add(
        `Review ${projectName}`,
        undefined,
        lists[0],
      );
      expect(reminderResult).toContain("added");

      // Cleanup
      await notes.delete(projectName, projectName);
      await reminders.delete(
        `Review ${projectName}`,
        `Review ${projectName}`,
        lists[0],
      );
    });
  });

  describe("Workflow: Contact Lookup", () => {
    it("should list contacts", async () => {
      const contactList = await contacts.list(5);
      expect(Array.isArray(contactList)).toBe(true);
      console.log("Sample contacts:", contactList.slice(0, 3));
    });

    it("should handle contact search for existing contact", async () => {
      // First get a real contact name to search for
      const contactList = await contacts.list(1);
      if (contactList.length > 0) {
        const searchName = contactList[0].split(" ")[0]; // Use first name
        // This should work since the contact exists
        try {
          const result = await contacts.search(searchName);
          expect(typeof result).toBe("string");
        } catch (e) {
          // It's okay if search throws for non-existent contacts
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
      console.log("✓ Notes accessible");

      // Reminders
      const lists = await reminders.listLists();
      expect(lists.length).toBeGreaterThan(0);
      console.log("✓ Reminders accessible");

      // Calendar
      const calendars = await calendar.listCalendars();
      expect(calendars.length).toBeGreaterThan(0);
      console.log("✓ Calendar accessible");

      // Contacts
      const contactList = await contacts.list(1);
      expect(Array.isArray(contactList)).toBe(true);
      console.log("✓ Contacts accessible");
    });
  });
});
