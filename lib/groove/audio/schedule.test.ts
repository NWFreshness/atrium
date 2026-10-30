import { describe, expect, it } from "vitest";
import { PATCHES } from "../patches";
import { STEPS, SWEEP_BARS } from "../types";
import type { MelodicStep, Patch } from "../types";
import { gapToNext, nextSteps, sweepValue } from "./schedule";

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

describe("nextSteps", () => {
  // 120 bpm: one sixteenth is 15 / 120 = 0.125 s. Sweep off, filter at 0.5.
  const patch = (swing = 0): Patch => ({
    ...PATCHES[0],
    bpm: 120,
    swing,
    master: { ...PATCHES[0].master, filter: 0.5, sweepDepth: 0 },
  });
  const at = (nextGridTime: number, step = 0, absStep = step) => ({
    nextGridTime,
    step,
    absStep,
  });

  it("schedules only the grid times inside the 120 ms look-ahead", () => {
    expect(nextSteps(1, at(1), patch()).map((s) => s.gridTime)).toEqual([1]);
    expect(nextSteps(1.13, at(1), patch()).map((s) => s.gridTime)).toEqual([
      1, 1.125,
    ]);
  });

  it("schedules nothing while the next grid time is past the look-ahead", () => {
    expect(nextSteps(1, at(1.2), patch())).toEqual([]);
    expect(nextSteps(1, at(2), patch())).toEqual([]);
  });

  it("delays odd steps by swing and leaves even steps on the grid", () => {
    // swing 0.5 pushes an off-beat by 0.5 * 0.66 * 0.125 = 0.04125 s.
    const [even, odd] = nextSteps(1.13, at(1), patch(0.5));
    expect(even.time).toBeCloseTo(1);
    expect(odd.gridTime).toBeCloseTo(1.125);
    expect(odd.time).toBeCloseTo(1.16625);
  });

  it("wraps the step at the bar while the absolute step keeps counting", () => {
    const steps = nextSteps(1.13, at(1, STEPS - 1, 2 * STEPS - 1), patch());
    expect(steps.map((s) => s.step)).toEqual([STEPS - 1, 0]);
    expect(steps.map((s) => s.absStep)).toEqual([2 * STEPS - 1, 2 * STEPS]);
  });

  it("reports the plain filter position when the sweep is off", () => {
    const [first] = nextSteps(1, at(1), patch());
    expect(first.filter).toBe(0.5);
    expect(first.phase).toBe(0);
  });

  it("closes the filter by the sweep depth at the start of a rising sweep", () => {
    const base = patch();
    const swept: Patch = {
      ...base,
      master: { ...base.master, sweepBars: 1, sweepShape: 0, sweepDepth: 0.4 },
    };
    const bars = SWEEP_BARS[1];
    const [start] = nextSteps(1, at(1, 0, 0), swept);
    expect(start.filter).toBeCloseTo(0.1);
    const [half] = nextSteps(1, at(1, 0, (bars * STEPS) / 2), swept);
    expect(half.phase).toBeCloseTo(0.5);
    expect(half.filter).toBeCloseTo(0.3);
  });
});
