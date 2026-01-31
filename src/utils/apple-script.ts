import { exec } from "node:child_process";
import { promisify } from "node:util";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

const execAsync = promisify(exec);

export class AppleScriptRunner {
  /**
   * Executes an AppleScript command and returns the result.
   * Logs warnings and errors to stderr to avoid corrupting MCP stdout.
   */
  static async execute(script: string, appName?: string): Promise<string> {
    try {
      let finalScript = script;

      // Extract target application if not explicitly provided
      const targetApp = appName || this.extractAppName(script);
      if (targetApp) {
        // Ensure application is launched before running commands
        // We use 'launch' instead of 'activate' to avoid stealing focus
        finalScript = `launch application "${targetApp}"\n${script}`;
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
      // Handle maxBuffer exceeded error
      if (error.message.includes("maxBuffer")) {
        console.error(
          "[MCP Error] Note content too large (>50MB). This usually means the note contains many large images.",
        );
        throw new McpError(
          ErrorCode.InternalError,
          "Note content exceeds 50MB limit. Try using maxLength parameter to limit output size.",
        );
      }

      // Handle macOS Automation permission errors (-1743)
      if (error.message.includes("-1743")) {
        console.error(
          "[MCP Error] Permission denied for AppleScript execution.",
        );
        throw new McpError(
          ErrorCode.InternalError,
          "macOS Permission Denied: Please grant this terminal/app 'Automation' access in System Settings > Privacy & Security.",
        );
      }

      // Handle "Application isn't running" error (-600) specifically if launch failed or apps crashed
      if (error.message.includes("-600")) {
        const targetApp =
          appName || this.extractAppName(script) || "Target Application";
        throw new McpError(
          ErrorCode.InternalError,
          `macOS Application Error: ${targetApp} is not running or failed to launch.`,
        );
      }

      console.error(`[MCP Error] AppleScript failed: ${error.message}`);
      throw new McpError(
        ErrorCode.InternalError,
        `AppleScript Execution Failed: ${error.message}`,
      );
    }
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
