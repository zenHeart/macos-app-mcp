import { AppleScriptRunner } from "../utils/apple-script.js";
import { ConfigManager } from "../utils/config.js";
import { OperationLogger } from "../utils/logger.js";
import { formatFolderTree } from "../utils/formatters.js";

/**
 * Notes Application Integration
 * Provides full CRUD functionality for macOS Notes with nested folder support
 */
export class Notes {
  private config = ConfigManager.getInstance();
  private logger = OperationLogger.getInstance();

  /**
   * Helper to convert "a/b/c" to 'folder "c" of folder "b" of folder "a"'
   */
  private folderToAppleScript(folderPath: string): string {
    if (!folderPath) return "";
    const parts = folderPath.split("/").filter(Boolean);
    if (parts.length === 0) return "";

    let script = `folder "${parts[parts.length - 1]}"`;
    for (let i = parts.length - 2; i >= 0; i--) {
      script += ` of folder "${parts[i]}"`;
    }
    return script;
  }

  /**
   * Helper to get note reference with full hierarchical folder context
   */
  private getNoteReference(title: string, folder?: string): string {
    const folderRef = folder ? this.folderToAppleScript(folder) : "";
    return folderRef ? `note "${title}" of ${folderRef}` : `note "${title}"`;
  }

  /**
   * Query notes list
   * @param search - Optional search keyword
   * @param folder - Optional folder to search in (supports nested paths)
   * @returns List of note titles
   */
  async query(search?: string, folder?: string): Promise<string[]> {
    const filter = search ? `whose name contains "${search}"` : "";
    const folderRef = folder ? this.folderToAppleScript(folder) : "";

    // Use tell app -> tell folder chain for robustness
    const script = folderRef
      ? `tell application "Notes" to tell ${folderRef} to get name of every note ${filter}`
      : `tell application "Notes" to get name of every note ${filter}`;

    const result = await AppleScriptRunner.execute(script, "Notes");
    return AppleScriptRunner.parseList(result);
  }

  /**
   * Get note content as plain text
   */
  async get(
    title: string,
    options?: {
      includeImages?: boolean;
      maxLength?: number;
      folder?: string;
    },
  ): Promise<string> {
    const includeImages = options?.includeImages ?? true;
    const maxLength = options?.maxLength;
    const folder = options?.folder;

    const noteRef = this.getNoteReference(title, folder);

    const htmlContent = await AppleScriptRunner.execute(
      `
      tell application "Notes"
        set theNote to ${noteRef}
        return body of theNote
      end tell
    `,
      "Notes",
    );

    // Better HTML to text conversion: handle block tags as newlines
    let plainText = htmlContent
      .replace(/<(h[1-6]|p|div|br)[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/data:image\/[^;]*;base64,[^\s]*/g, "[IMAGE]")
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line, index, self) =>
          line !== "" || (index > 0 && self[index - 1] !== ""),
      )
      .join("\n")
      .trim();

    if (includeImages) {
      const imageCount = (htmlContent.match(/data:image/g) || []).length;
      if (imageCount > 0) {
        plainText += `\n\n[Note: This note contains ${imageCount} embedded image(s)]`;
      }
    }

    if (maxLength && plainText.length > maxLength) {
      plainText =
        plainText.substring(0, maxLength) + `\n\n[Content truncated...]`;
    }

    return plainText;
  }

  /**
   * Create a new note
   */
  async create(
    title: string,
    content: string,
    folder?: string,
    options: { skipLog?: boolean } = {},
  ): Promise<string> {
    const targetFolder = folder || this.config.getDefaultNotesFolder();
    const folderRef = this.folderToAppleScript(targetFolder);

    // If the content already starts with the title, strip it to avoid duplication
    // when setting both name and body in AppleScript.
    let body = content;
    const titleRegex = new RegExp(
      `^${title.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*\\n?`,
      "i",
    );
    if (titleRegex.test(body)) {
      body = body.replace(titleRegex, "").trim();
    }

    const folderClause = folderRef ? `in ${folderRef}` : "in default account";

    await AppleScriptRunner.execute(
      `
      tell application "Notes"
        make new note ${folderClause} with properties {name:"${title}", body:"${body}"}
      end tell
    `,
      "Notes",
    );

    if (!options.skipLog) {
      await this.logger.log(
        "create",
        "notes",
        { title },
        { after: content },
        { folder: targetFolder },
      );
    }

    return `Note "${title}" created successfully in folder "${targetFolder}"`;
  }

  /**
   * Update an existing note's content
   */
  async update(
    title: string,
    newContent: string,
    folder?: string,
  ): Promise<string> {
    if (!this.config.canUpdate()) {
      throw new Error("Update operations are disabled.");
    }

    const noteRef = this.getNoteReference(title, folder);
    const oldContent = await this.get(title, { folder });

    await AppleScriptRunner.execute(
      `
      tell application "Notes"
        set body of ${noteRef} to "${newContent}"
      end tell
    `,
      "Notes",
    );

    await this.logger.log(
      "update",
      "notes",
      { title },
      { before: oldContent, after: newContent },
      { folder },
    );

    return `Note "${title}" updated successfully`;
  }

  /**
   * Delete a note with confirmation
   */
  async delete(
    title: string,
    confirmTitle: string,
    folder?: string,
  ): Promise<string> {
    if (!this.config.canDelete()) {
      throw new Error("Delete operations are disabled.");
    }

    if (title !== confirmTitle) {
      throw new Error(`Deletion cancelled: Confirmation title does not match.`);
    }

    const noteRef = this.getNoteReference(title, folder);
    const content = await this.get(title, { folder });

    let finalFolder = folder;
    if (!finalFolder) {
      try {
        const folderName = await AppleScriptRunner.execute(
          `
          tell application "Notes"
            set theNote to ${noteRef}
            return name of folder of theNote
          end tell
        `,
          "Notes",
        );
        finalFolder = folderName.trim();
      } catch (e) {
        // Fallback
      }
    }

    await AppleScriptRunner.execute(
      `
      tell application "Notes" to delete ${noteRef}
    `,
      "Notes",
    );

    await this.logger.log(
      "delete",
      "notes",
      { title },
      { before: content, after: null },
      { confirmed: true, folder: finalFolder },
    );

    return `Note "${title}" deleted successfully.`;
  }

  /**
   * List all available folders with hierarchical paths and tree formatting
   */
  async listFolders(): Promise<string> {
    const script = `
      tell application "Notes"
        set folderList to {}
        repeat with aFolder in every folder
            set folderName to name of aFolder
            set folderPath to folderName
            set currentF to aFolder
            repeat
                try
                    set parentF to container of currentF
                    if class of parentF is folder then
                        set folderPath to name of parentF & "/" & folderPath
                        set currentF to parentF
                    else
                        exit repeat
                    end if
                on error
                    exit repeat
                end try
            end repeat
            copy folderPath to end of folderList
        end repeat
        return folderList
      end tell
    `;
    const result = await AppleScriptRunner.execute(script, "Notes");
    const paths = AppleScriptRunner.parseList(result);
    return formatFolderTree(paths);
  }
}
