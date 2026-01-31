# Test Scenarios

This document describes test scenarios that simulate real user workflows. Use these scenarios to validate the MCP server functionality.

## Quick Validation Checklist

Before releasing, ensure all these basic operations work:

- [ ] List all notes folders
- [ ] List all reminder lists
- [ ] List all calendars
- [ ] Create a note with title and content
- [ ] Create a reminder with due date
- [ ] Create a calendar event
- [ ] Delete created test items

---

## Scenario 1: Notes Workflow

### 1.1 Basic Note Operations

```
Goal: User wants to create, read, and organize notes

Steps:
1. notes_list_folders → Get available folders
2. notes_create → Create note "Meeting Notes" with content
3. notes_query → Search for "Meeting"
4. notes_get → Read the full note content
5. notes_update → Update the note with new content
6. notes_delete → Delete the note (with confirmation)
```

### 1.2 Note Search Across Folders

```
Goal: User has notes in multiple folders and wants to find specific content

Steps:
1. notes_query {search: "project"} → Search all folders
2. notes_query {folder: "Work"} → List notes in specific folder
3. notes_query {search: "urgent", folder: "Work"} → Combined search
```

---

## Scenario 2: Reminders Workflow

### 2.1 Basic Reminder Operations

```
Goal: User wants to manage their todo list

Steps:
1. reminders_list_lists → Get available lists
2. reminders_list → View all reminders as tree
3. reminders_add {text: "Buy groceries"} → Add simple reminder
4. reminders_add {text: "Submit report", due: "2026-02-01 09:00", listName: "Work"} → Add with due date
5. reminders_complete {text: "Buy groceries"} → Mark as done
6. reminders_delete → Delete reminder (with confirmation)
```

### 2.2 Organizing Reminders by List

```
Goal: User wants to categorize reminders

Steps:
1. reminders_list_lists → See available lists
2. reminders_add {text: "Call mom", listName: "Personal"}
3. reminders_add {text: "Fix bug #123", listName: "Work"}
4. reminders_list {listName: "Work"} → View only work reminders
```

---

## Scenario 3: Calendar Workflow

### 3.1 Viewing and Creating Events

```
Goal: User wants to check schedule and create events

Steps:
1. calendar_list_calendars → Get available calendars
2. calendar_list {date: "today"} → View today's events
3. calendar_list {date: "2026-02-01"} → View specific date
4. calendar_create_event {
     summary: "Team Meeting",
     startDate: "2026-02-01 10:00",
     endDate: "2026-02-01 11:00",
     calendarName: "Work"
   }
5. calendar_delete_event → Delete event (with confirmation)
```

---

## Scenario 4: Contacts Workflow

### 4.1 Finding Contact Information

```
Goal: User needs to reach out to a contact

Steps:
1. contacts_list {limit: 10} → Browse recent contacts
2. contacts_search {name: "John"} → Find by name
3. contacts_get_details {exactName: "John Smith"} → Get full details
4. contacts_search_by_phone {phoneNumber: "123-456"} → Reverse lookup
5. contacts_search_by_email {email: "john@"} → Find by email
```

---

## Scenario 5: Cross-App Workflows

### 5.1 Meeting Preparation

```
Goal: User preparing for a meeting

Steps:
1. calendar_list {date: "today"} → Check today's meetings
2. notes_query {search: "meeting agenda"} → Find related notes
3. contacts_search {name: "meeting attendee"} → Get contact info
4. reminders_add {text: "Prepare slides for 2pm meeting", due: "today 13:00"}
```

### 5.2 Project Status Update

```
Goal: User tracking project tasks

Steps:
1. reminders_list {listName: "Project X"} → Get all project todos
2. notes_get {title: "Project X Status"} → Read status notes
3. notes_update → Update status with completed items
4. reminders_complete → Mark completed tasks
```

---

## Scenario 6: Error Handling

### 6.1 Non-existent Resources

```
Goal: Verify proper error handling

Steps:
1. notes_get {title: "NonExistentNote12345"} → Should return clear error
2. reminders_list {listName: "NonExistentList"} → Should return error -1728
3. contacts_search {name: "xyzabc123"} → Should return "not found"
```

### 6.2 Permission Errors

```
Goal: Verify safety checks work

Steps:
1. notes_delete {title: "Test", confirmTitle: "Wrong"} → Should fail confirmation
2. reminders_delete {text: "Test", confirmText: "Wrong"} → Should fail confirmation
3. With MCP_ALLOW_DELETE=false: Try delete → Should be disabled
```

---

## Scenario 7: Recovery Operations

### 7.1 Recovering Deleted Items

```
Goal: User accidentally deleted something

Steps:
1. recovery_stats → View recovery statistics
2. recovery_list {app: "notes", operation: "delete"} → List deleted notes
3. recovery_details {operationId: "xxx"} → Get details for recovery
4. recovery_recover {operationId: "xxx", confirmId: "xxx"} → Recover item
```

---

## Integration Test Commands

Run these automated tests:

```bash
# Full test suite
pnpm run test:integration

# Individual scenarios
pnpm run test:integration -- --grep "Notes"
pnpm run test:integration -- --grep "Reminders"
pnpm run test:integration -- --grep "Calendar"
pnpm run test:integration -- --grep "Contacts"
pnpm run test:integration -- --grep "Recovery"
```
