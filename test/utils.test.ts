import { describe, it, expect } from "vitest";
import { AppleScriptRunner } from "../src/utils/apple-script.js";

describe("AppleScript Utility", () => {
  it("should parse a comma-separated list into an array", () => {
    const input = "Note A, Note B, Note C";
    const expected = ["Note A", "Note B", "Note C"];
    expect(AppleScriptRunner.parseList(input)).toEqual(expected);
  });

  it("should return an empty array for empty input", () => {
    expect(AppleScriptRunner.parseList("")).toEqual([]);
  });

  it("should trim whitespace from list items", () => {
    const input = " Item 1 , Item 2 ";
    const expected = ["Item 1", "Item 2"];
    expect(AppleScriptRunner.parseList(input)).toEqual(expected);
  });
});
