import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEAL_STAGES } from "./constants";
import {
  closeBeforeExclusive,
  parseCloseDate,
  parseStage,
} from "./deal-params";

describe("parseStage", () => {
  it("accepts every DEAL_STAGE in enum order", () => {
    expect([...DEAL_STAGES]).toEqual([
      "New",
      "Qualified",
      "Proposal",
      "Negotiation",
      "Won",
      "Lost",
    ]);
    for (const stage of DEAL_STAGES) {
      expect(parseStage(stage)).toBe(stage);
    }
  });

  it("ignores unknown stages, empties, and missing values", () => {
    expect(parseStage("Bogus")).toBeUndefined();
    expect(parseStage("new")).toBeUndefined();
    expect(parseStage("")).toBeUndefined();
    expect(parseStage(undefined)).toBeUndefined();
  });

  it("reads the first value of a repeated param", () => {
    expect(parseStage(["Won", "Lost"])).toBe("Won");
    expect(parseStage(["Bogus", "Won"])).toBeUndefined();
  });
});

describe("parseCloseDate", () => {
  it("parses strict YYYY-MM-DD as UTC midnight", () => {
    expect(parseCloseDate("2026-09-30")?.toISOString()).toBe(
      "2026-09-30T00:00:00.000Z",
    );
  });

  it("rejects impossible calendar days and loose shapes", () => {
    expect(parseCloseDate("2026-02-31")).toBeUndefined();
    expect(parseCloseDate("2026-2-3")).toBeUndefined();
    expect(parseCloseDate("09/30/2026")).toBeUndefined();
    expect(parseCloseDate("")).toBeUndefined();
    expect(parseCloseDate(undefined)).toBeUndefined();
  });

  it("reads the first value of a repeated param", () => {
    expect(parseCloseDate(["2026-09-30", "2026-10-01"])?.toISOString()).toBe(
      "2026-09-30T00:00:00.000Z",
    );
    expect(parseCloseDate(["2026-02-31", "2026-09-30"])).toBeUndefined();
  });
});

describe("closeBeforeExclusive", () => {
  it("adds one day so the picked last day stays inside the half-open window", () => {
    expect(closeBeforeExclusive("2026-12-31")).toBe(
      "2027-01-01T00:00:00.000Z",
    );
    expect(closeBeforeExclusive("2026-09-30")).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });

  it("passes malformed input through as undefined", () => {
    expect(closeBeforeExclusive("2026-02-31")).toBeUndefined();
    expect(closeBeforeExclusive("2026-2-3")).toBeUndefined();
    expect(closeBeforeExclusive(undefined)).toBeUndefined();
  });
});

describe("deal-params client safety", () => {
  it("imports only ./constants — no database reach", () => {
    const source = readFileSync(resolve("lib/crm/deal-params.ts"), "utf8");
    for (const forbidden of [
      "queries",
      "schema",
      "lib/db",
      "drizzle-orm",
    ]) {
      expect(source, forbidden).not.toContain(forbidden);
    }
    expect(source).toContain('from "./constants"');
  });
});
