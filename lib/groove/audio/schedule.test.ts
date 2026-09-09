import { describe, expect, it } from "vitest";
import { STEPS } from "../types";
import type { MelodicStep } from "../types";
import { gapToNext, sweepValue } from "./schedule";

const rest = (on = false): MelodicStep => ({
  on,
  note: 48,
  chord: 0,
  vel: 0.8,
});

describe("gapToNext", () => {
  it("returns STEPS when every step is a rest", () => {
    const steps = Array.from({ length: STEPS }, () => rest());
    expect(gapToNext(steps, 0)).toBe(STEPS);
  });

  it("counts the steps to the next hit, wrapping the loop", () => {
    const steps = Array.from({ length: STEPS }, () => rest());
    steps[4] = rest(true);
    expect(gapToNext(steps, 0)).toBe(4);
    // From step 5, the loop scans i=1..16, hitting step 4 when i=15
    // ((5+15) % 16 == 4).
    expect(gapToNext(steps, 5)).toBe(15);
    // From step 4 (the only hit), the loop never finds another `on`.
    expect(gapToNext(steps, 4)).toBe(STEPS);
  });

  it("never returns 0", () => {
    const steps = Array.from({ length: STEPS }, () => rest(true));
    expect(gapToNext(steps, 0)).toBeGreaterThanOrEqual(1);
  });
});

describe("sweepValue", () => {
  it("rises from 0 to 1 on shape 0 (rise)", () => {
    expect(sweepValue(0, 0)).toBeCloseTo(0);
    expect(sweepValue(0.5, 0)).toBeCloseTo(0.5);
    expect(sweepValue(1, 0)).toBeCloseTo(1);
  });

  it("falls from 1 to 0 on shape 1 (fall)", () => {
    expect(sweepValue(0, 1)).toBeCloseTo(1);
    expect(sweepValue(1, 1)).toBeCloseTo(0);
  });

  it("triangulates on shape 2", () => {
    expect(sweepValue(0, 2)).toBeCloseTo(0);
    expect(sweepValue(0.5, 2)).toBeCloseTo(1);
    expect(sweepValue(1, 2)).toBeCloseTo(0);
  });

  it("sines on shape 3", () => {
    expect(sweepValue(0, 3)).toBeCloseTo(0);
    expect(sweepValue(0.5, 3)).toBeCloseTo(1);
    expect(sweepValue(1, 3)).toBeCloseTo(0);
  });

  it("rounds a non-integer shape index", () => {
    expect(sweepValue(0.5, 0.6)).toBeCloseTo(sweepValue(0.5, 1));
  });
});
