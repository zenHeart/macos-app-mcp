import { exec } from "node:child_process";
import { promisify } from "node:util";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

const execAsync = promisify(exec);

export class AppleScriptRunner {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 500;

  /**
   * Sleeps for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Executes an AppleScript command and returns the result.
   * Logs warnings and errors to stderr to avoid corrupting MCP stdout.
   * Includes retry logic for transient connection errors (-609).
   */
  static async execute(script: string, appName?: string): Promise<string> {
    const targetApp = appName || this.extractAppName(script);
    let lastError: Error | null = null;

    // Retry loop to handle transient connection issues (-609 errors)
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        let finalScript = script;

        if (targetApp) {
          // Use a more robust application launch strategy:
          // 1. Use 'tell application' block which handles launching automatically
          // 2. Add a small delay after ensuring the app is running
          // 3. This avoids the -609 "Connection is invalid" error
          finalScript = `
tell application "${targetApp}"
  run
  delay 0.5
end tell
${script}`;
        }

        const escapedScript = finalScript.replace(/'/g, "'\\''");

        // Increase maxBuffer to 50MB to handle large notes with embedded images
        // Default is 1MB which is too small for notes with base64 images
        const { stdout, stderr } = await execAsync(
          `osascript -e '${escapedScript}'`,
          { maxBuffer: 50 * 1024 * 1024 }, // 50MB
        );

        if (stderr) {
          console.error(`[AppleScript Warning]: ${stderr}`);
        }

        return stdout.trim();
      } catch (error: any) {
        lastError = error;

        // Handle -609 "Connection is invalid" error with retry
        if (error.message.includes("-609")) {
          console.error(
            `[MCP Warning] Connection invalid (-609), attempt ${attempt}/${this.MAX_RETRIES}...`,
          );
          if (attempt < this.MAX_RETRIES) {
            await this.sleep(this.RETRY_DELAY_MS * attempt);
            continue;
          }
          throw new McpError(
            ErrorCode.InternalError,
            `macOS Connection Error: Failed to connect to ${targetApp || "application"} after ${this.MAX_RETRIES} attempts. Please ensure the app can be accessed and try again.`,
          );
        }

        // Handle maxBuffer exceeded error - no retry
        if (error.message.includes("maxBuffer")) {
          console.error(
            "[MCP Error] Note content too large (>50MB). This usually means the note contains many large images.",
          );
          throw new McpError(
            ErrorCode.InternalError,
            "Note content exceeds 50MB limit. Try using maxLength parameter to limit output size.",
          );
        }

        // Handle macOS Automation permission errors (-1743) - no retry
        if (error.message.includes("-1743")) {
          console.error(
            "[MCP Error] Permission denied for AppleScript execution.",
          );
          throw new McpError(
            ErrorCode.InternalError,
            "macOS Permission Denied: Please grant this terminal/app 'Automation' access in System Settings > Privacy & Security.",
          );
        }

        // Handle "Application isn't running" error (-600) - no retry
        if (error.message.includes("-600")) {
          throw new McpError(
            ErrorCode.InternalError,
            `macOS Application Error: ${targetApp || "Target Application"} is not running or failed to launch.`,
          );
        }

        // For other errors, throw immediately
        // Only log if not in silent mode (useful for expected error tests)
        if (!process.env.MCP_SILENT_EXPECTED_ERRORS) {
          console.error(`[MCP Error] AppleScript failed: ${error.message}`);
        }
        throw new McpError(
          ErrorCode.InternalError,
          `AppleScript Execution Failed: ${error.message}`,
        );
      }
    }

    // Should not reach here, but handle edge case
    throw new McpError(
      ErrorCode.InternalError,
      `AppleScript Execution Failed: ${lastError?.message || "Unknown error"}`,
    );
  }

  /**
   * Basic regex to extract "Calendar", "Notes", etc. from 'tell application "..."'
   */
  private static extractAppName(script: string): string | null {
    const match = script.match(/tell\s+application\s+"([^"]+)"/i);
    return match ? match[1] : null;
  }

  /**
   * Helper to parse AppleScript list outputs into a clean array.
   */
  static parseList(output: string): string[] {
    if (!output) return [];
    return output.split(",").map((item) => item.trim());
  }
}
