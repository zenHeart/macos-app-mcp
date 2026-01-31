import { describe, it, expect, vi, beforeEach } from "vitest";
import { Notes } from "../src/apps/notes.js";
import { AppleScriptRunner } from "../src/utils/apple-script.js";
import { ConfigManager } from "../src/utils/config.js";
import { OperationLogger } from "../src/utils/logger.js";

vi.mock("../src/utils/apple-script.js");
vi.mock("../src/utils/config.js");
vi.mock("../src/utils/logger.js");

describe("Notes", () => {
  let notes: Notes;
  let mockConfig: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      getDefaultNotesFolder: vi.fn().mockReturnValue("ai"),
      canDelete: vi.fn().mockReturnValue(true),
      canUpdate: vi.fn().mockReturnValue(true),
    };
    vi.mocked(ConfigManager.getInstance).mockReturnValue(mockConfig);
    mockLogger = { log: vi.fn().mockResolvedValue("test-id") };
    vi.mocked(OperationLogger.getInstance).mockReturnValue(mockLogger);
    notes = new Notes();
  });

  describe("query", () => {
    it("should list all notes", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("Note 1, Note 2");
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue([
        "Note 1",
        "Note 2",
      ]);

      const result = await notes.query();
      expect(result).toEqual(["Note 1", "Note 2"]);
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('application "Notes"'),
        "Notes",
      );
    });

    it("should query in specific folder with hierarchical path", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("SubNote");
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue(["SubNote"]);

      const result = await notes.query(undefined, "life/sub");
      expect(result).toEqual(["SubNote"]);
      // Should build folder ref
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('folder "sub" of folder "life"'),
        "Notes",
      );
    });
  });

  describe("get", () => {
    it("should get note content and strip HTML", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(
        "<div>Hello world</div>",
      );
      const result = await notes.get("Test Note");
      expect(result).toBe("Hello world");
    });

    it("should get note from nested folder", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("Content");
      await notes.get("Note", { folder: "A/B" });
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('folder "B" of folder "A"'),
        "Notes",
      );
    });
  });

  describe("create", () => {
    it("should create note in default folder", async () => {
      await notes.create("New Title", "Body");
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('in folder "ai"'),
        "Notes",
      );
    });

    it("should create note in nested folder", async () => {
      await notes.create("New", "Body", "a/b/c");
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('in folder "c" of folder "b" of folder "a"'),
        "Notes",
      );
    });
  });

  describe("update", () => {
    it("should update content", async () => {
      vi.mocked(AppleScriptRunner.execute)
        .mockResolvedValueOnce("old body")
        .mockResolvedValueOnce("");
      await notes.update("Title", "New Content");
      // The new syntax uses 'first note whose name contains' and sets body of it
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('first note whose name contains "Title"'),
        "Notes",
      );
    });

    it("should update with nested folder context", async () => {
      vi.mocked(AppleScriptRunner.execute)
        .mockResolvedValueOnce("")
        .mockResolvedValueOnce("");
      await notes.update("Title", "Content", "Special/Path");
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('folder "Path" of folder "Special"'),
        "Notes",
      );
    });
  });

  describe("delete", () => {
    it("should delete when title matches", async () => {
      vi.mocked(AppleScriptRunner.execute)
        .mockResolvedValueOnce("body") // get content
        .mockResolvedValueOnce("FolderA") // get folder name
        .mockResolvedValueOnce(""); // delete

      const result = await notes.delete("DeleteMe", "DeleteMe");
      expect(result).toContain("deleted successfully");
      // The new syntax uses 'first note whose name contains' for the delete
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('first note whose name contains "DeleteMe"'),
        "Notes",
      );
    });

    it("should delete with nested folder context", async () => {
      vi.mocked(AppleScriptRunner.execute)
        .mockResolvedValueOnce("body")
        .mockResolvedValueOnce("");
      await notes.delete("X", "X", "Nested/Folder");
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('folder "Folder" of folder "Nested"'),
        "Notes",
      );
    });
  });

  describe("listFolders", () => {
    it("should list folders with hierarchical paths and return tree string", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(
        "life, life/nested, work",
      );
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue([
        "life",
        "life/nested",
        "work",
      ]);

      const result = await notes.listFolders();
      expect(typeof result).toBe("string");
      expect(result).toContain("├── life");
      expect(result).toContain("└── work");
    });
  });
});
