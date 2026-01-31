import { AppleScriptRunner } from "../utils/apple-script.js";
import { ConfigManager } from "../utils/config.js";
import { OperationLogger } from "../utils/logger.js";
import { generateAppleScriptDate } from "../utils/date-parser.js";

/**
 * Calendar Application Integration
 * Provides functionality to query and manage macOS Calendar events
 */
export class Calendar {
  private config = ConfigManager.getInstance();
  private logger = OperationLogger.getInstance();

  /**
   * List calendar events for a specific date
   * @param date - Date string, defaults to "today"
   * @returns List of events
   */
  async listEvents(date: string = "today"): Promise<string[]> {
    const { setupCode, variableName } = generateAppleScriptDate(
      date,
      "theDate",
    );

    const result = await AppleScriptRunner.execute(
      `
      tell application "Calendar"
        ${setupCode}
        -- Normalize to beginning of day
        set time of ${variableName} to 0
        set startOfDay to ${variableName}
        set endOfDay to ${variableName} + (24 * 60 * 60) - 1
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

    const startSetup = generateAppleScriptDate(startDate, "startD");
    const endSetup = generateAppleScriptDate(endDate, "endD");

    await AppleScriptRunner.execute(
      `
      tell application "Calendar"
        ${startSetup.setupCode}
        ${endSetup.setupCode}
        make new event ${calendarClause} with properties {summary:"${summary}", start date:${startSetup.variableName}, end date:${endSetup.variableName}${locationProp}}
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

    const { setupCode, variableName } = generateAppleScriptDate(
      startDate,
      "targetDate",
    );

    // Get event details before deletion for logging
    const eventDetails = await AppleScriptRunner.execute(
      `
      tell application "Calendar"
        ${setupCode}
        repeat with theCalendar in calendars
          set matchingEvents to (every event of theCalendar whose summary is "${summary}" and start date is ${variableName})
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
        ${setupCode}
        repeat with theCalendar in calendars
          set matchingEvents to (every event of theCalendar whose summary is "${summary}" and start date is ${variableName})
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
