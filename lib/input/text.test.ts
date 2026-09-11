import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertText,
  escapeIlike,
  MAX_BLOCK_TEXT,
  MAX_LONG_TEXT,
  MAX_SHORT_TEXT,
} from "./text";

describe("assertText", () => {
  it("accepts a string at the max and rejects one over", () => {
    expect(assertText("a".repeat(500), 500)).toBe("a".repeat(500));
    expect(() => assertText("a".repeat(501), 500)).toThrow("text too long");
  });

  it("keeps nullish and rejects non-strings", () => {
    expect(assertText(null, 10)).toBeNull();
    expect(assertText(undefined, 10)).toBeUndefined();
    expect(() => assertText(12, 10)).toThrow("invalid text");
  });

  it("defines the three ceilings once", () => {
    expect(MAX_SHORT_TEXT).toBe(500);
    expect(MAX_LONG_TEXT).toBe(8_000);
    expect(MAX_BLOCK_TEXT).toBe(20_000);
  });
});

describe("escapeIlike", () => {
  it("escapes backslash, percent, and underscore", () => {
    expect(escapeIlike("%_")).not.toBe("%_");
    expect(escapeIlike("%_")).toBe("\\%\\_");
    expect(escapeIlike("a\\b")).toBe("a\\\\b");
  });
});

describe("CRM drizzle search uses escapeIlike", () => {
  it("wraps the bound ILIKE pattern", () => {
    const source = readFileSync(
      new URL("../crm/queries-drizzle.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("escapeIlike");
    expect(source).toMatch(/ilike \$\{containsPattern\(term\)\} escape/i);
  });
});
