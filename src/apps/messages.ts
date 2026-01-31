import { exec } from "node:child_process";
import { promisify } from "node:util";
import { AppleScriptRunner } from "../utils/apple-script.js";

const execAsync = promisify(exec);

/**
 * Messages Application Integration
 * Provides functionality to send iMessages and make phone calls
 */
export class Messages {
  /**
   * Send iMessage
   * @param target - Target contact or number
   * @param text - Message content
   */
  async send(target: string, text: string): Promise<void> {
    await AppleScriptRunner.execute(
      `
      tell application "Messages"
        set targetService to 1st service whose service type is iMessage
        set targetBuddy to buddy "${target}" of targetService
        send "${text}" to targetBuddy
      end tell
    `,
      "Messages",
    );
  }

  /**
   * Make a phone call
   * @param number - Phone number
   */
  async call(number: string): Promise<void> {
    const cleanNumber = number.replace(/\s/g, "");
    await execAsync(`open "tel://${cleanNumber}"`);
  }
}
