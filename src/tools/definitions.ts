import { z } from "zod";

export const ToolDefinitions = [
  // ===== Notes Tools =====
  {
    name: "notes_query",
    description: "Search or list notes from macOS Notes app",
    schema: z.object({
      search: z.string().optional(),
      folder: z.string().optional(),
    }),
  },
  {
    name: "notes_get",
    description:
      "Read note content as plain text (HTML stripped). Use maxLength to limit output for large notes.",
    schema: z.object({
      title: z.string(),
      maxLength: z.number().optional(),
      folder: z.string().optional(),
    }),
  },
  {
    name: "notes_create",
    description: "Create a new note with title and content",
    schema: z.object({
      title: z.string(),
      content: z.string(),
      folder: z.string().optional(),
    }),
  },
  {
    name: "notes_update",
    description: "Update an existing note's content",
    schema: z.object({
      title: z.string(),
      newContent: z.string(),
      folder: z.string().optional(),
    }),
  },
  {
    name: "notes_delete",
    description: "Delete a note (requires exact title confirmation for safety)",
    schema: z.object({
      title: z.string(),
      confirmTitle: z.string(),
      folder: z.string().optional(),
    }),
  },
  {
    name: "notes_list_folders",
    description: "List all available note folders",
    schema: z.object({}),
  },

  // ===== Reminders Tools =====
  {
    name: "reminders_list",
    description: "List incomplete reminders",
    schema: z.object({ list: z.string().optional() }),
  },
  {
    name: "reminders_add",
    description: "Add a new reminder",
    schema: z.object({
      text: z.string(),
      due: z.string().optional(),
      listName: z.string().optional(),
    }),
  },
  {
    name: "reminders_complete",
    description: "Mark a reminder as completed",
    schema: z.object({
      text: z.string(),
      listName: z.string().optional(),
    }),
  },
  {
    name: "reminders_update",
    description: "Update a reminder's text or due date",
    schema: z.object({
      oldText: z.string(),
      newText: z.string().optional(),
      newDue: z.string().optional(),
      listName: z.string().optional(),
    }),
  },
  {
    name: "reminders_delete",
    description:
      "Delete a reminder (requires exact text confirmation for safety)",
    schema: z.object({
      text: z.string(),
      confirmText: z.string(),
      listName: z.string().optional(),
    }),
  },
  {
    name: "reminders_list_lists",
    description: "List all reminder lists",
    schema: z.object({}),
  },

  // ===== Calendar Tools =====
  {
    name: "calendar_list",
    description:
      "List calendar events for a specific date (e.g., 'today' or '2026-01-31')",
    schema: z.object({ date: z.string().optional() }),
  },
  {
    name: "calendar_create_event",
    description: "Create a new calendar event",
    schema: z.object({
      summary: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      calendarName: z.string().optional(),
      location: z.string().optional(),
    }),
  },
  {
    name: "calendar_delete_event",
    description:
      "Delete a calendar event (requires exact summary confirmation for safety)",
    schema: z.object({
      summary: z.string(),
      startDate: z.string(),
      confirmSummary: z.string(),
    }),
  },
  {
    name: "calendar_list_calendars",
    description: "List all available calendars",
    schema: z.object({}),
  },

  // ===== Contacts Tools =====
  {
    name: "contacts_search",
    description: "Search for a contact's phone or email by name",
    schema: z.object({ name: z.string() }),
  },
  {
    name: "contacts_list",
    description: "List all contacts (limited to prevent overwhelming output)",
    schema: z.object({ limit: z.number().optional() }),
  },
  {
    name: "contacts_get_details",
    description: "Get detailed contact information by exact name",
    schema: z.object({ exactName: z.string() }),
  },
  {
    name: "contacts_search_by_phone",
    description: "Search for a contact by phone number",
    schema: z.object({ phoneNumber: z.string() }),
  },
  {
    name: "contacts_search_by_email",
    description: "Search for a contact by email address",
    schema: z.object({ email: z.string() }),
  },

  // ===== Messages Tools =====
  {
    name: "call_number",
    description: "Initiate a phone call via FaceTime or iPhone",
    schema: z.object({ number: z.string() }),
  },
  {
    name: "message_send",
    description: "Send an iMessage to a contact or number",
    schema: z.object({ target: z.string(), text: z.string() }),
  },

  // ===== Recovery Tools =====
  {
    name: "recovery_list",
    description: "List recoverable operations (deleted/modified items)",
    schema: z.object({
      app: z.enum(["notes", "reminders", "calendar"]).optional(),
      operation: z.enum(["delete", "update"]).optional(),
      limit: z.number().optional(),
    }),
  },
  {
    name: "recovery_details",
    description: "Get details about a specific operation for recovery",
    schema: z.object({
      operationId: z.string(),
    }),
  },
  {
    name: "recovery_recover",
    description:
      "Recover a deleted or modified item (requires exact operation ID confirmation)",
    schema: z.object({
      operationId: z.string(),
      confirmId: z.string(),
    }),
  },
  {
    name: "recovery_stats",
    description:
      "Get recovery statistics (total operations, recoverable items, etc.)",
    schema: z.object({}),
  },

  // ===== Operation Log Tools =====
  {
    name: "logs_recent",
    description: "Get recent operations log",
    schema: z.object({
      limit: z.number().optional(),
    }),
  },
  {
    name: "logs_by_app",
    description: "Get operations log for a specific app",
    schema: z.object({
      app: z.enum(["notes", "reminders", "calendar", "contacts"]),
      limit: z.number().optional(),
    }),
  },
];
