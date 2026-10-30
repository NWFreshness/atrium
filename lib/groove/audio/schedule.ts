import type { MelodicStep, Patch } from "../types";
import { STEPS, SWEEP_BARS } from "../types";

/** How far past `now` the scheduler commits notes, in seconds. */
export const SCHEDULE_AHEAD = 0.12;

/** Where the scheduler is: the next unswung grid time and the step due there. */
export type ScheduleCursor = {
  nextGridTime: number;
  step: number;
  /** never wraps, so multi-bar sweeps stay in phase */
  absStep: number;
};

export type ScheduledStep = {
  step: number;
  absStep: number;
  /** the unswung grid time; the filter moves on this */
  gridTime: number;
  /** when the step sounds, swing included */
  time: number;
  filter: number;
  phase: number;
};

/** Steps until the next active step, wrapping the loop. Used for note length. */
export function gapToNext(steps: MelodicStep[], from: number): number {
  for (let i = 1; i <= STEPS; i++) {
    if (steps[(from + i) % STEPS].on) return i;
  }
  return STEPS;
}

/** Sweep shapes: rise, fall, triangle, sine. 0 is fully closed, 1 fully open. */
export function sweepValue(phase: number, shape: number): number {
  switch (Math.round(shape)) {
    case 1:
      return 1 - phase;
    case 2:
      return phase < 0.5 ? phase * 2 : 2 - phase * 2;
    case 3:
      return 0.5 - Math.cos(phase * Math.PI * 2) / 2;
    default:
      return phase;
  }
}

/** Effective filter position at a given absolute step, including the sweep. */
function filterAt(absStep: number, m: Patch["master"]) {
  const bars = SWEEP_BARS[Math.round(m.sweepBars)] ?? 0;
  if (!bars || m.sweepDepth <= 0.001) return { filter: m.filter, phase: 0 };
  const phase = (absStep % (bars * STEPS)) / (bars * STEPS);
  const open = sweepValue(phase, m.sweepShape);
  const filter = Math.max(0, Math.min(1, m.filter - m.sweepDepth * (1 - open)));
  return { filter, phase };
}

/** Every step due between the cursor and the look-ahead horizon, in order. */
export function nextSteps(
  now: number,
  cursor: ScheduleCursor,
  patch: Patch,
): ScheduledStep[] {
  const secPerStep = 15 / patch.bpm;
  const swing = patch.swing * 0.66;
  const due: ScheduledStep[] = [];
  let { nextGridTime: gridTime, step, absStep } = cursor;
  while (gridTime < now + SCHEDULE_AHEAD) {
    due.push({
      step,
      absStep,
      gridTime,
      time: gridTime + (step % 2 === 1 ? swing * secPerStep : 0),
      ...filterAt(absStep, patch.master),
    });
    gridTime += secPerStep;
    step = (step + 1) % STEPS;
    absStep++;
  }
  return due;
}
