import { AppleScriptRunner } from "../utils/apple-script.js";
import { ConfigManager } from "../utils/config.js";
import { OperationLogger } from "../utils/logger.js";

/**
 * Calendar Application Integration
 * Provides functionality to query and manage macOS Calendar events
 */
export class Calendar {
  private config = ConfigManager.getInstance();
  private logger = OperationLogger.getInstance();

  /**
   * Helper to convert ISO-style date strings to AppleScript date object construction.
   * This avoids issues with system locale formats for date "..." strings.
   * Supports: "2024-01-01", "2024-01-01 10:00", "January 1, 2024 10:00:00"
   */
  private parseDateToAppleScript(dateStr: string): string {
    // If it's a relative offset like "today", use helper or pass as is
    if (dateStr.toLowerCase() === "today") {
      return "(current date)";
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Fallback to literal if JS Date fails to parse
      return `date "${dateStr}"`;
    }

    // Explicitly set properties for localized robustness
    return `(current date) as record
      set theResult to (current date)
      set year of theResult to ${date.getFullYear()}
      set month of theResult to ${date.getMonth() + 1}
      set day of theResult to ${date.getDate()}
      set hours of theResult to ${date.getHours()}
      set minutes of theResult to ${date.getMinutes()}
      set seconds of theResult to ${date.getSeconds()}
      theResult`;
  }

  /**
   * List calendar events for a specific date
   * @param date - Date string, defaults to "today"
   * @returns List of events
   */
  async listEvents(date: string = "today"): Promise<string[]> {
    const dateObjBuilder = this.parseDateToAppleScript(date);

    const result = await AppleScriptRunner.execute(
      `
      tell application "Calendar"
        set theDate to ${dateObjBuilder}
        -- Normalize to beginning of day
        set time of theDate to 0
        set startOfDay to theDate
        set endOfDay to theDate + (24 * 60 * 60) - 1
        set eventList to {}
        repeat with theCalendar in calendars
          set theEvents to (every event of theCalendar whose start date is greater than or equal to startOfDay and start date is less than or equal to endOfDay)
          repeat with theEvent in theEvents
            copy (summary of theEvent & " (" & (start date of theEvent as string) & ")") to end of eventList
          end repeat
        end repeat
        return eventList
      end tell
    `,
      "Calendar",
    );
    return AppleScriptRunner.parseList(result);
  }

  /**
   * Create a new calendar event
   * @param summary - Event title/summary
   * @param startDate - Start date and time
   * @param endDate - End date and time
   * @param calendarName - Optional calendar name (defaults to default calendar)
   * @param location - Optional location
   * @returns Success message
   */
  async createEvent(
    summary: string,
    startDate: string,
    endDate: string,
    calendarName?: string,
    location?: string,
  ): Promise<string> {
    const targetCalendar = calendarName || this.config.getDefaultCalendar();
    const calendarClause = targetCalendar
      ? `in calendar "${targetCalendar}"`
      : "in default calendar";
    const locationProp = location ? `, location:"${location}"` : "";

    const startObj = this.parseDateToAppleScript(startDate);
    const endObj = this.parseDateToAppleScript(endDate);

    await AppleScriptRunner.execute(
      `
      tell application "Calendar"
        set startD to ${startObj}
        set endD to ${endObj}
        make new event ${calendarClause} with properties {summary:"${summary}", start date:startD, end date:endD${locationProp}}
      end tell
    `,
      "Calendar",
    );

    // Log the operation
    await this.logger.log(
      "create",
      "calendar",
      { summary },
      { after: { startDate, endDate, calendar: targetCalendar, location } },
      { folder: targetCalendar },
    );

    return `Event "${summary}" created successfully for ${startDate}`;
  }

  /**
   * Delete a calendar event with confirmation
   * @param summary - Event summary to delete
   * @param startDate - Start date of the event (for precise matching)
   * @param confirmSummary - Confirmation: must match the summary exactly
   * @returns Success message
   * @throws Error if confirmation doesn't match
   */
  async deleteEvent(
    summary: string,
    startDate: string,
    confirmSummary: string,
  ): Promise<string> {
    // Check permission
    if (!this.config.canDelete()) {
      throw new Error(
        "Delete operations are disabled. Set MCP_ALLOW_DELETE=true to enable.",
      );
    }

    // Safety check: require exact summary confirmation
    if (summary !== confirmSummary) {
      throw new Error(
        `Deletion cancelled: Confirmation summary "${confirmSummary}" does not match "${summary}". ` +
          `To delete, you must provide the exact event summary as confirmation.`,
      );
    }

    const dateObj = this.parseDateToAppleScript(startDate);

    // Get event details before deletion for logging
    const eventDetails = await AppleScriptRunner.execute(
      `
      tell application "Calendar"
        set targetDate to ${dateObj}
        repeat with theCalendar in calendars
          set matchingEvents to (every event of theCalendar whose summary is "${summary}" and start date is targetDate)
          if (count of matchingEvents) > 0 then
            set theEvent to first item of matchingEvents
            return {summary of theEvent, start date of theEvent as string, end date of theEvent as string, name of theCalendar, location of theEvent}
          end if
        end repeat
        return ""
      end tell
    `,
      "Calendar",
    );

    await AppleScriptRunner.execute(
      `
      tell application "Calendar"
        set targetDate to ${dateObj}
        repeat with theCalendar in calendars
          set matchingEvents to (every event of theCalendar whose summary is "${summary}" and start date is targetDate)
          repeat with theEvent in matchingEvents
            delete theEvent
          end repeat
        end repeat
      end tell
    `,
      "Calendar",
    );

    // Log the operation
    if (eventDetails) {
      const [_sum, start, end, cal, loc] =
        AppleScriptRunner.parseList(eventDetails);
      await this.logger.log(
        "delete",
        "calendar",
        { summary },
        {
          before: {
            startDate: start,
            endDate: end,
            calendar: cal,
            location: loc,
          },
          after: null,
        },
        { confirmed: true, folder: cal },
      );
    }

    return `Event "${summary}" on ${startDate} deleted successfully`;
  }

  /**
   * List all available calendars
   * @returns List of calendar names
   */
  async listCalendars(): Promise<string[]> {
    const result = await AppleScriptRunner.execute(
      `
      tell application "Calendar"
        get name of every calendar
      end tell
    `,
      "Calendar",
    );
    return AppleScriptRunner.parseList(result);
  }
}
