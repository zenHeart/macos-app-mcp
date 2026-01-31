import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import { OperationLogger } from "../src/utils/logger.js";
import { ConfigManager } from "../src/utils/config.js";

vi.mock("node:fs");
vi.mock("node:crypto", () => ({
  randomUUID: () => "test-uuid",
}));

describe("OperationLogger", () => {
  let logger: OperationLogger;
  const mockLogPath = "/mock/path/ops.log";

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock config
    vi.spyOn(ConfigManager.getInstance(), "getLogPath").mockReturnValue(
      mockLogPath,
    );
    vi.spyOn(ConfigManager.getInstance(), "isLoggingEnabled").mockReturnValue(
      true,
    );

    logger = OperationLogger.getInstance();
  });

  it("should create log directory if it doesn't exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    (OperationLogger as any).instance = undefined; // Trigger constructor
    OperationLogger.getInstance();

    expect(fs.mkdirSync).toHaveBeenCalledWith("/mock/path", {
      recursive: true,
    });
  });

  it("should append log entry to file", async () => {
    vi.mocked(fs.statSync).mockReturnValue({ size: 100 } as any);

    const target = { title: "Test Note" };
    const data = { after: "content" };

    const id = await logger.log("create", "notes", target, data);

    expect(id).toBe("test-uuid");
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      mockLogPath,
      expect.stringContaining('"operation":"create"'),
      "utf-8",
    );
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      mockLogPath,
      expect.stringContaining('"app":"notes"'),
      "utf-8",
    );
  });

  it("should not log if logging is disabled", async () => {
    vi.spyOn(ConfigManager.getInstance(), "isLoggingEnabled").mockReturnValue(
      false,
    );

    const id = await logger.log(
      "create",
      "notes",
      { title: "X" },
      { after: "Y" },
    );

    expect(id).toBe("");
    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });

  it("should rotate log if it exceeds max size", async () => {
    vi.spyOn(ConfigManager.getInstance(), "getMaxLogSize").mockReturnValue(1); // 1MB
    vi.mocked(fs.statSync).mockReturnValue({ size: 2 * 1024 * 1024 } as any); // 2MB
    vi.mocked(fs.existsSync).mockReturnValue(true);

    await logger.log("create", "notes", { title: "X" }, { after: "Y" });

    expect(fs.renameSync).toHaveBeenCalledWith(
      mockLogPath,
      `${mockLogPath}.old`,
    );
  });

  it("should read logs and filter by app", async () => {
    const mockContent =
      JSON.stringify({
        app: "notes",
        operation: "create",
        timestamp: "2024-01-01",
      }) +
      "\n" +
      JSON.stringify({
        app: "reminders",
        operation: "add",
        timestamp: "2024-01-02",
      });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

    const logs = await logger.readLogs({ app: "notes" });

    expect(logs.length).toBe(1);
    expect(logs[0].app).toBe("notes");
  });
});
