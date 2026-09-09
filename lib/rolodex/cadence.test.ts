import { describe, expect, it } from "vitest";
import { cadenceDays, computeStatus } from "./cadence";
import type { CadencePerson } from "./cadence";

const close: CadencePerson = {
  circle: "close",
  cadenceOverrideDays: null,
  checkinsOff: false,
  snoozedUntil: null,
};

describe("cadenceDays", () => {
  it("uses the circle default", () => {
    expect(cadenceDays(close)).toBe(91);
  });

  it("uses a positive override", () => {
    expect(cadenceDays({ ...close, cadenceOverrideDays: 14 })).toBe(14);
  });

  it("returns null when check-ins are off", () => {
    expect(cadenceDays({ ...close, checkinsOff: true })).toBeNull();
  });
});

describe("computeStatus", () => {
  it("marks never-contacted as due_soon (clock starts on the computation day)", () => {
    // Bench code: nextDue = today when lastContacted is null, so they are not red on day one.
    expect(computeStatus(close, null, "2026-03-01").status).toBe("due_soon");
    expect(computeStatus(close, null, "2026-03-02").status).toBe("due_soon");
  });

  it("is in_touch when the next due date is more than a week away", () => {
    expect(computeStatus(close, "2026-02-01", "2026-02-10").status).toBe(
      "in_touch",
    );
  });

  it("is due_soon within seven days of next due", () => {
    expect(computeStatus(close, "2026-01-01", "2026-03-26").status).toBe(
      "due_soon",
    );
  });

  it("is overdue after the cadence window", () => {
    const result = computeStatus(close, "2026-01-01", "2026-04-10");
    expect(result.status).toBe("overdue");
    expect(result.daysOverdue).toBeGreaterThan(0);
  });

  it("honors a shorter override", () => {
    const person = { ...close, cadenceOverrideDays: 7 };
    expect(computeStatus(person, "2026-03-01", "2026-03-10").status).toBe(
      "overdue",
    );
  });

  it("returns off when check-ins are disabled", () => {
    expect(
      computeStatus({ ...close, checkinsOff: true }, null, "2026-03-01").status,
    ).toBe("off");
  });

  it("returns snoozed until the snooze date, then resumes", () => {
    const person = { ...close, snoozedUntil: "2026-03-10" };
    expect(computeStatus(person, "2025-01-01", "2026-03-10").status).toBe(
      "snoozed",
    );
    expect(computeStatus(person, "2025-01-01", "2026-03-11").status).toBe(
      "overdue",
    );
  });
});
