import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ConfigManager } from "../src/utils/config.js";

describe("ConfigManager", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Clear instance to allow re-initialization with new env
    (ConfigManager as any).instance = undefined;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return default values when no environment variables are set", () => {
    const config = ConfigManager.getInstance();
    expect(config.getDefaultNotesFolder()).toBe("ai");
    expect(config.getDefaultRemindersList()).toBe("ai");
    expect(config.canDelete()).toBe(false);
    expect(config.canUpdate()).toBe(false);
    expect(config.isLoggingEnabled()).toBe(true);
  });

  it("should return custom values from environment variables", () => {
    process.env.MCP_NOTES_FOLDER = "custom_notes";
    process.env.MCP_REMINDERS_LIST = "custom_reminders";
    process.env.MCP_ALLOW_DELETE = "true";
    process.env.MCP_ALLOW_UPDATE = "true";
    process.env.MCP_LOGGING_ENABLED = "false";

    const config = ConfigManager.getInstance();
    expect(config.getDefaultNotesFolder()).toBe("custom_notes");
    expect(config.getDefaultRemindersList()).toBe("custom_reminders");
    expect(config.canDelete()).toBe(true);
    expect(config.canUpdate()).toBe(true);
    expect(config.isLoggingEnabled()).toBe(false);
  });

  it("should handle default calendar", () => {
    const config = ConfigManager.getInstance();
    expect(config.getDefaultCalendar()).toBeUndefined();

    process.env.MCP_CALENDAR = "Work";
    (ConfigManager as any).instance = undefined; // Force refresh
    const config2 = ConfigManager.getInstance();
    expect(config2.getDefaultCalendar()).toBe("Work");
  });

  it("should handle log size and retention defaults", () => {
    const config = ConfigManager.getInstance();
    expect(config.getMaxLogSize()).toBe(10);
    expect(config.getRetentionDays()).toBe(30);
  });

  it("should handle custom log size and retention", () => {
    process.env.MCP_LOG_MAX_SIZE = "50";
    process.env.MCP_LOG_RETENTION_DAYS = "90";

    const config = ConfigManager.getInstance();
    expect(config.getMaxLogSize()).toBe(50);
    expect(config.getRetentionDays()).toBe(90);
  });
});
