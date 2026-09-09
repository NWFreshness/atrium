import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  currentAge,
  datesInMonth,
  daysBetweenISO,
  effectiveDay,
  nextOccurrence,
  shiftMonth,
} from "./dates";

describe("ISO date helpers", () => {
  it("adds calendar days across a month boundary", () => {
    expect(addDaysISO("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("counts calendar days between two ISO dates", () => {
    expect(daysBetweenISO("2026-01-01", "2026-01-08")).toBe(7);
    expect(daysBetweenISO("2026-01-08", "2026-01-01")).toBe(-7);
  });
});

describe("effectiveDay", () => {
  it("celebrates 29 February on the 28th in a common year", () => {
    expect(effectiveDay(2, 29, 2025)).toBe(28);
    expect(effectiveDay(2, 29, 2024)).toBe(29);
  });
});

describe("nextOccurrence", () => {
  it("rolls into the next calendar year when this year's date has passed", () => {
    const occ = nextOccurrence({ month: 1, day: 1, year: 1990 }, "2026-03-01");
    expect(occ.date).toBe("2027-01-01");
    expect(occ.ageTurning).toBe(37);
    expect(occ.milestone).toBe(false);
  });

  it("flags a milestone when the age this year ends in 0", () => {
    const occ = nextOccurrence({ month: 6, day: 15, year: 1986 }, "2026-01-01");
    expect(occ.date).toBe("2026-06-15");
    expect(occ.ageTurning).toBe(40);
    expect(occ.milestone).toBe(true);
  });

  it("places a 29 February birthday on 28 February in a common year", () => {
    const occ = nextOccurrence({ month: 2, day: 29, year: 2000 }, "2025-01-01");
    expect(occ.date).toBe("2025-02-28");
  });
});

describe("currentAge", () => {
  it("returns null when the year is unknown", () => {
    expect(currentAge({ month: 6, day: 15 }, "2026-06-16")).toBeNull();
  });

  it("has already incremented after the birthday this year", () => {
    expect(currentAge({ month: 6, day: 15, year: 1990 }, "2026-06-16")).toBe(
      36,
    );
  });

  it("has not incremented before the birthday this year", () => {
    expect(currentAge({ month: 6, day: 15, year: 1990 }, "2026-06-14")).toBe(
      35,
    );
  });
});

describe("shiftMonth", () => {
  it("crosses a year boundary", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("datesInMonth", () => {
  it("places a 29 February date on the 28th in a common year", () => {
    const entries = datesInMonth(
      [
        {
          id: "1",
          personId: "p",
          personName: "Sam",
          type: "birthday",
          label: null,
          month: 2,
          day: 29,
          year: 2000,
        },
      ],
      2025,
      2,
    );
    expect(entries[0]?.day).toBe(28);
    expect(entries[0]?.date).toBe("2025-02-28");
    expect(entries[0]?.milestone).toBe(false);
  });
});
