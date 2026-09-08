import { describe, expect, it } from "vitest";
import {
  ACTIVITY_TYPES,
  CONTACT_STATUSES,
  DEAL_STAGES,
  STAGE_PROBABILITY,
  expectedValue,
} from "./constants";

describe("DEAL_STAGES", () => {
  it("lists Bench pipeline stages in order", () => {
    expect(DEAL_STAGES).toEqual([
      "New",
      "Qualified",
      "Proposal",
      "Negotiation",
      "Won",
      "Lost",
    ]);
  });
});

describe("STAGE_PROBABILITY", () => {
  it("matches Bench win probabilities for each stage", () => {
    expect(STAGE_PROBABILITY).toEqual({
      New: 10,
      Qualified: 25,
      Proposal: 50,
      Negotiation: 75,
      Won: 100,
      Lost: 0,
    });
  });
});

describe("expectedValue", () => {
  it("returns half the value at 50 percent probability", () => {
    expect(expectedValue({ value: 10000, probability: 50 })).toBe(5000);
  });

  it("returns zero when probability is Lost", () => {
    expect(expectedValue({ value: 25000, probability: 0 })).toBe(0);
  });

  it("returns the full value when probability is Won", () => {
    expect(expectedValue({ value: 8000, probability: 100 })).toBe(8000);
  });
});

describe("CONTACT_STATUSES", () => {
  it("matches Bench contact statuses", () => {
    expect(CONTACT_STATUSES).toEqual(["lead", "qualified", "customer"]);
  });
});

describe("ACTIVITY_TYPES", () => {
  it("matches Bench activity types", () => {
    expect(ACTIVITY_TYPES).toEqual(["note", "call", "email"]);
  });
});
