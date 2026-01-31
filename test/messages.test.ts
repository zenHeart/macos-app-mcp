import { describe, it, expect, vi, beforeEach } from "vitest";
import { Messages } from "../src/apps/messages.js";
import { AppleScriptRunner } from "../src/utils/apple-script.js";
import { exec } from "node:child_process";

vi.mock("../src/utils/apple-script.js", () => ({
  AppleScriptRunner: {
    execute: vi.fn(),
  },
}));

vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

vi.mock("node:util", () => ({
  promisify: (fn: any) => fn,
}));

describe("Messages", () => {
  let messages: Messages;

  beforeEach(() => {
    messages = new Messages();
    vi.clearAllMocks();
  });

  describe("send", () => {
    it("should send iMessage to target", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("success");

      await messages.send("+1234567890", "Hello World");

      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('buddy "+1234567890"'),
        "Messages",
      );
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('send "Hello World"'),
        "Messages",
      );
    });

    it("should handle contact names as targets", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("success");

      await messages.send("John Doe", "Meeting at 3pm");

      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('buddy "John Doe"'),
        "Messages",
      );
    });
  });

  describe("call", () => {
    it("should initiate call with phone number", async () => {
      vi.mocked(exec).mockImplementation((() => {
        return Promise.resolve({ stdout: "", stderr: "" });
      }) as any);

      await messages.call("+1234567890");

      expect(exec).toHaveBeenCalledWith('open "tel://+1234567890"');
    });

    it("should remove spaces from phone number", async () => {
      vi.mocked(exec).mockImplementation((() => {
        return Promise.resolve({ stdout: "", stderr: "" });
      }) as any);

      await messages.call("+1 234 567 890");

      expect(exec).toHaveBeenCalledWith('open "tel://+1234567890"');
    });
  });
});
