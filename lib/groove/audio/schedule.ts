import type { MelodicStep } from "../types";
import { STEPS } from "../types";

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
