import { describe, expect, it } from "vitest";
import { PATCHES } from "./patches";
import {
  patchIsDirty,
  setBpm,
  setDrumStep,
  setNoteStep,
  setSwing,
  setUnitParam,
} from "./patch-edit";
import type { MelodicStep } from "./types";

describe("patch-edit helpers", () => {
  it("setUnitParam does not mutate the original", () => {
    const original = PATCHES[0];
    const copy = setUnitParam(original, "drums", "drive", 0.99);
    expect(original.drums.params.drive).not.toBe(0.99);
    expect(copy.drums.params.drive).toBe(0.99);
    expect(original.bass.params).toEqual(copy.bass.params);
  });

  it("setDrumStep replaces a single step value", () => {
    const original = PATCHES[0];
    const copy = setDrumStep(original, "kick", 2, 2);
    expect(copy.drums.steps.kick[2]).toBe(2);
    expect(original.drums.steps.kick[2]).not.toBe(2);
  });

  it("setNoteStep replaces one melodic step", () => {
    const original = PATCHES[0];
    const step: MelodicStep = { on: true, note: 84, chord: 0, vel: 0.9 };
    const copy = setNoteStep(original, "lead", 0, step);
    expect(copy.lead.steps[0]).toEqual(step);
    expect(original.lead.steps[0].note).not.toBe(84);
  });

  it("setBpm rounds, setSwing clamps to [0, 1)", () => {
    const bpm = setBpm(PATCHES[0], 112.6);
    expect(bpm.bpm).toBe(113);
    expect(setSwing(PATCHES[0], 1.5).swing).toBeCloseTo(0.99);
    expect(setSwing(PATCHES[0], -1).swing).toBe(0);
  });

  it("patchIsDirty catches every kind of edit", () => {
    const factory = PATCHES[0];
    expect(patchIsDirty(factory, factory)).toBe(false);
    expect(patchIsDirty(setBpm(factory, 120), factory)).toBe(true);
    expect(patchIsDirty(setSwing(factory, 0.4), factory)).toBe(true);
    expect(
      patchIsDirty(
        setNoteStep(factory, "bass", 1, { ...factory.bass.steps[1], note: 70 }),
        factory,
      ),
    ).toBe(true);
    expect(patchIsDirty(setDrumStep(factory, "kick", 3, 2), factory)).toBe(
      true,
    );
    expect(
      patchIsDirty(
        setNoteStep(factory, "bass", 0, { ...factory.bass.steps[0], note: 70 }),
        factory,
      ),
    ).toBe(true);
  });
});
