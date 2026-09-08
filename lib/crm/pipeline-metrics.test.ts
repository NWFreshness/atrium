import { describe, expect, it } from "vitest";
import type { Deal } from "./queries";
import {
  columnTotals,
  isOpen,
  sumExpected,
  sumValue,
} from "./pipeline-metrics";

function deal(
  partial: Pick<Deal, "stage" | "value" | "probability">,
): Pick<Deal, "stage" | "value" | "probability"> {
  return partial;
}

const openNew = deal({ stage: "New", value: 1000, probability: 10 });
const openProposal = deal({
  stage: "Proposal",
  value: 4000,
  probability: 50,
});
const won = deal({ stage: "Won", value: 8000, probability: 100 });
const lost = deal({ stage: "Lost", value: 25000, probability: 0 });

describe("isOpen", () => {
  it("is true for stages that are not Won or Lost", () => {
    expect(isOpen(deal({ stage: "New", value: 1, probability: 10 }))).toBe(
      true,
    );
    expect(
      isOpen(deal({ stage: "Qualified", value: 1, probability: 25 })),
    ).toBe(true);
    expect(isOpen(deal({ stage: "Proposal", value: 1, probability: 50 }))).toBe(
      true,
    );
    expect(
      isOpen(deal({ stage: "Negotiation", value: 1, probability: 75 })),
    ).toBe(true);
  });

  it("is false for Won and Lost", () => {
    expect(isOpen(won)).toBe(false);
    expect(isOpen(lost)).toBe(false);
  });
});

describe("sumValue", () => {
  it("sums value for open deals only", () => {
    expect(sumValue([openNew, openProposal, won, lost])).toBe(5000);
  });
});

describe("sumExpected", () => {
  it("sums expectedValue for open deals only", () => {
    // 1000 * 10/100 + 4000 * 50/100 = 100 + 2000
    expect(sumExpected([openNew, openProposal, won, lost])).toBe(2100);
  });
});

describe("columnTotals", () => {
  it("sums value and expected for deals in that stage, including Won and Lost", () => {
    const deals = [openNew, openProposal, won, lost];
    expect(columnTotals(deals, "New")).toEqual({
      sumValue: 1000,
      sumExpected: 100,
    });
    expect(columnTotals(deals, "Proposal")).toEqual({
      sumValue: 4000,
      sumExpected: 2000,
    });
    expect(columnTotals(deals, "Won")).toEqual({
      sumValue: 8000,
      sumExpected: 8000,
    });
    expect(columnTotals(deals, "Lost")).toEqual({
      sumValue: 25000,
      sumExpected: 0,
    });
  });

  it("does not include other stages in the column total", () => {
    expect(columnTotals([openNew, openProposal], "Qualified")).toEqual({
      sumValue: 0,
      sumExpected: 0,
    });
  });
});
