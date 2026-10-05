import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_MONEY, assertMoney, assertPercent } from "./numbers";

describe("assertMoney", () => {
  it("accepts zero and the ceiling", () => {
    expect(assertMoney(0)).toBe(0);
    expect(assertMoney(MAX_MONEY)).toBe(MAX_MONEY);
  });

  it("accepts a fractional value (money is not required to be an integer)", () => {
    expect(assertMoney(1000.5)).toBe(1000.5);
  });

  it("rejects negative, over-the-ceiling, NaN, Infinity, and strings", () => {
    expect(() => assertMoney(-0.01)).toThrow("invalid money");
    expect(() => assertMoney(MAX_MONEY + 1)).toThrow("invalid money");
    expect(() => assertMoney(NaN)).toThrow("invalid money");
    expect(() => assertMoney(Infinity)).toThrow("invalid money");
    expect(() => assertMoney("1")).toThrow("invalid money");
  });
});

describe("assertPercent", () => {
  it("accepts zero and one hundred", () => {
    expect(assertPercent(0)).toBe(0);
    expect(assertPercent(100)).toBe(100);
  });

  it("rejects a float, negatives, over-100, and NaN", () => {
    expect(() => assertPercent(10.5)).toThrow("invalid percent");
    expect(() => assertPercent(-1)).toThrow("invalid percent");
    expect(() => assertPercent(101)).toThrow("invalid percent");
    expect(() => assertPercent(NaN)).toThrow("invalid percent");
  });
});

describe("CRM drizzle does not import the number asserts", () => {
  it("queries-drizzle.ts has no assertMoney or assertPercent", () => {
    const source = readFileSync(
      new URL("../crm/queries-drizzle.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toContain("assertMoney");
    expect(source).not.toContain("assertPercent");
  });
});
