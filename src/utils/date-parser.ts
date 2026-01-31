/**
 * Date parsing utility for AppleScript
 * Provides robust date conversion that works across different locales
 */

/**
 * Generate AppleScript code to create a date object from components.
 * Returns an object containing:
 * - setupCode: AppleScript code to run before using the variable
 * - variableName: The name of the variable containing the date
 *
 * This approach avoids issues with locale-specific date formats.
 *
 * @param dateStr - Date string in ISO format (e.g., "2024-01-15" or "2024-01-15 10:30")
 * @param varName - Variable name to use for the date (default: "theDate")
 * @returns Object with setupCode and variableName
 */
export function generateAppleScriptDate(
  dateStr: string,
  varName: string = "theDate",
): { setupCode: string; variableName: string } {
  // Handle "today" as special case
  if (dateStr.toLowerCase() === "today") {
    return {
      setupCode: `set ${varName} to (current date)`,
      variableName: varName,
    };
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // Fallback to string literal if parsing fails
    return {
      setupCode: `set ${varName} to date "${dateStr}"`,
      variableName: varName,
    };
  }

  // Generate AppleScript that builds the date from components
  // This is locale-independent
  const setupCode = `
set ${varName} to (current date)
set year of ${varName} to ${date.getFullYear()}
set month of ${varName} to ${date.getMonth() + 1}
set day of ${varName} to ${date.getDate()}
set hours of ${varName} to ${date.getHours()}
set minutes of ${varName} to ${date.getMinutes()}
set seconds of ${varName} to ${date.getSeconds()}`;

  return {
    setupCode: setupCode.trim(),
    variableName: varName,
  };
}

/**
 * Legacy wrapper for simple cases where only a single date expression is needed.
 * This returns a self-contained AppleScript expression that evaluates to a date.
 *
 * Note: This uses a tell block to create the date, which may not work in all contexts.
 * For complex scripts, prefer generateAppleScriptDate().
 *
 * @param dateStr - Date string to parse
 * @returns AppleScript expression that evaluates to a date
 */
export function parseDateToAppleScriptExpression(dateStr: string): string {
  if (dateStr.toLowerCase() === "today") {
    return "(current date)";
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return `date "${dateStr}"`;
  }

  // Create an inline script block that returns a date
  // Using "my" to access the handler from within tell blocks
  return `(do shell script "date -j -f '%Y-%m-%d %H:%M:%S' '${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}' '+%s'") as integer as date`;
}
