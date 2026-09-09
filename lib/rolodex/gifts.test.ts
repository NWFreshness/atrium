import { describe, expect, it } from "vitest";
import { giftIdeasToSurface } from "./gifts";
import type { Gift, ImportantDate } from "./queries";

const gift = (overrides: Partial<Gift> = {}): Gift => ({
  id: "g1",
  tenantId: "t",
  personId: "p",
  name: "Field notes",
  kind: "idea",
  occasion: "birthday",
  date: "2026-03-01",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const date = (overrides: Partial<ImportantDate> = {}): ImportantDate => ({
  id: "d1",
  tenantId: "t",
  personId: "p",
  type: "birthday",
  label: null,
  month: 4,
  day: 10,
  year: 1990,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("giftIdeasToSurface", () => {
  it("surfaces outstanding ideas when a date is within 30 days", () => {
    const ideas = giftIdeasToSurface(
      [gift(), gift({ id: "g2", kind: "given", name: "Mug" })],
      [date()],
      "2026-03-20",
    );
    expect(ideas.map((row) => row.id)).toEqual(["g1"]);
  });

  it("does not surface ideas when no date is within 30 days", () => {
    expect(giftIdeasToSurface([gift()], [date()], "2026-01-01")).toEqual([]);
  });
});
