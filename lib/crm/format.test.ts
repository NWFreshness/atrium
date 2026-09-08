import { describe, expect, it } from "vitest";
import { formatDate, formatMoney } from "./format";

describe("formatMoney", () => {
  it("formats a whole dollar amount as USD", () => {
    expect(formatMoney(25000)).toBe("$25,000.00");
  });

  it("formats zero as USD", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("formats cents as USD", () => {
    expect(formatMoney(12.5)).toBe("$12.50");
  });
});

describe("formatDate", () => {
  it("returns an empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("formats a calendar date in en-US", () => {
    expect(formatDate(new Date("2026-12-01T00:00:00.000Z"))).toBe(
      "Dec 1, 2026",
    );
  });
});
