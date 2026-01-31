import { describe, it, expect, vi, beforeEach } from "vitest";
import { Contacts } from "../src/apps/contacts.js";
import { AppleScriptRunner } from "../src/utils/apple-script.js";

// Mock AppleScript execution
vi.mock("../src/utils/apple-script.js");

describe("Contacts", () => {
  let contacts: Contacts;

  beforeEach(() => {
    contacts = new Contacts();
    vi.clearAllMocks();
  });

  describe("search", () => {
    it("should return contact information by name", async () => {
      const contactInfo = "Name: John Doe\nPhone (work): 555-1234\n";
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(contactInfo);

      const result = await contacts.search("John");

      expect(result).toBe(contactInfo);
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('whose name contains "John"'),
        "Contacts",
      );
    });

    it("should include phone and email information", async () => {
      const contactInfo =
        "Name: Jane Smith\n" +
        "Phone (mobile): 555-5678\n" +
        "Email (work): jane@example.com\n";
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(contactInfo);

      const result = await contacts.search("Jane");

      expect(result).toContain("Phone");
      expect(result).toContain("Email");
    });
  });

  describe("list", () => {
    it("should return list of contact names with default limit", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(
        "John Doe, Jane Smith, Bob Johnson",
      );
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue([
        "John Doe",
        "Jane Smith",
        "Bob Johnson",
      ]);

      const result = await contacts.list();

      expect(result).toEqual(["John Doe", "Jane Smith", "Bob Johnson"]);
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining("if counter >= 50"),
        "Contacts",
      );
    });

    it("should respect custom limit", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(
        "Contact 1, Contact 2",
      );
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue([
        "Contact 1",
        "Contact 2",
      ]);

      const result = await contacts.list(10);

      expect(result).toHaveLength(2);
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining("if counter >= 10"),
        "Contacts",
      );
    });

    it("should return empty array when no contacts exist", async () => {
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue("");
      vi.mocked(AppleScriptRunner.parseList).mockReturnValue([]);

      const result = await contacts.list();

      expect(result).toEqual([]);
    });
  });

  describe("getDetails", () => {
    it("should return detailed contact information", async () => {
      const detailedInfo =
        "=== Contact Details ===\n" +
        "Name: John Doe\n" +
        "Organization: Acme Corp\n" +
        "\nPhones:\n" +
        "  work: 555-1234\n" +
        "  mobile: 555-5678\n" +
        "\nEmails:\n" +
        "  work: john@acme.com\n" +
        "\nAddresses:\n" +
        "  work: 123 Main St\n";

      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(detailedInfo);

      const result = await contacts.getDetails("John Doe");

      expect(result).toContain("=== Contact Details ===");
      expect(result).toContain("Organization:");
      expect(result).toContain("Phones:");
      expect(result).toContain("Emails:");
      expect(result).toContain("Addresses:");
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('whose name is "John Doe"'),
        "Contacts",
      );
    });

    it("should handle contacts without organization", async () => {
      const detailedInfo =
        "=== Contact Details ===\n" +
        "Name: Jane Smith\n" +
        "\nPhones:\n" +
        "  mobile: 555-9999\n";

      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(detailedInfo);

      const result = await contacts.getDetails("Jane Smith");

      expect(result).toContain("Jane Smith");
      expect(result).toContain("Phones:");
    });
  });

  describe("searchByPhone", () => {
    it("should find contact by phone number", async () => {
      const contactInfo = "Name: John Doe\nPhone (work): 555-1234\n";
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(contactInfo);

      const result = await contacts.searchByPhone("555-1234");

      expect(result).toContain("John Doe");
      expect(result).toContain("555-1234");
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('value of phones contains "555-1234"'),
        "Contacts",
      );
    });

    it("should return not found message when no match", async () => {
      const notFoundMsg = "No contact found with phone number: 555-9999";
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(notFoundMsg);

      const result = await contacts.searchByPhone("555-9999");

      expect(result).toBe(notFoundMsg);
    });

    it("should handle multiple phone numbers for same contact", async () => {
      const contactInfo =
        "Name: Jane Smith\n" +
        "Phone (work): 555-1111\n" +
        "Phone (mobile): 555-2222\n";

      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(contactInfo);

      const result = await contacts.searchByPhone("555-2222");

      expect(result).toContain("Jane Smith");
      expect(result).toContain("555-1111");
      expect(result).toContain("555-2222");
    });
  });

  describe("searchByEmail", () => {
    it("should find contact by email address", async () => {
      const contactInfo = "Name: John Doe\nEmail (work): john@example.com\n";
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(contactInfo);

      const result = await contacts.searchByEmail("john@example.com");

      expect(result).toContain("John Doe");
      expect(result).toContain("john@example.com");
      expect(AppleScriptRunner.execute).toHaveBeenCalledWith(
        expect.stringContaining('value of emails contains "john@example.com"'),
        "Contacts",
      );
    });

    it("should return not found message when no match", async () => {
      const notFoundMsg = "No contact found with email: notfound@example.com";
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(notFoundMsg);

      const result = await contacts.searchByEmail("notfound@example.com");

      expect(result).toBe(notFoundMsg);
    });

    it("should handle multiple email addresses for same contact", async () => {
      const contactInfo =
        "Name: Jane Smith\n" +
        "Email (work): jane@work.com\n" +
        "Email (personal): jane@personal.com\n";

      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(contactInfo);

      const result = await contacts.searchByEmail("jane@work.com");

      expect(result).toContain("Jane Smith");
      expect(result).toContain("jane@work.com");
      expect(result).toContain("jane@personal.com");
    });

    it("should be case-insensitive for email search", async () => {
      const contactInfo = "Name: Bob\nEmail (work): Bob@Example.COM\n";
      vi.mocked(AppleScriptRunner.execute).mockResolvedValue(contactInfo);

      const result = await contacts.searchByEmail("bob@example.com");

      expect(result).toContain("Bob");
    });
  });
});
