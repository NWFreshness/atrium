import type { DrumLane, MelodicStep, Patch, UnitId } from "./types";

type MelodicId = "bass" | "pads" | "lead";

export function setUnitParam(
  patch: Patch,
  unit: UnitId,
  key: string,
  v: number,
): Patch {
  switch (unit) {
    case "drums":
      return {
        ...patch,
        drums: {
          ...patch.drums,
          params: { ...patch.drums.params, [key]: v },
        },
      };
    case "bass":
      return {
        ...patch,
        bass: { ...patch.bass, params: { ...patch.bass.params, [key]: v } },
      };
    case "pads":
      return {
        ...patch,
        pads: { ...patch.pads, params: { ...patch.pads.params, [key]: v } },
      };
    case "lead":
      return {
        ...patch,
        lead: { ...patch.lead, params: { ...patch.lead.params, [key]: v } },
      };
  }
}

export function setNoteStep(
  patch: Patch,
  unit: MelodicId,
  index: number,
  step: MelodicStep,
): Patch {
  const replace = (steps: MelodicStep[]) =>
    steps.map((s, i) => (i === index ? step : s));
  switch (unit) {
    case "bass":
      return {
        ...patch,
        bass: { ...patch.bass, steps: replace(patch.bass.steps) },
      };
    case "pads":
      return {
        ...patch,
        pads: { ...patch.pads, steps: replace(patch.pads.steps) },
      };
    case "lead":
      return {
        ...patch,
        lead: { ...patch.lead, steps: replace(patch.lead.steps) },
      };
  }
}

export function setDrumStep(
  patch: Patch,
  lane: DrumLane,
  index: number,
  value: number,
): Patch {
  return {
    ...patch,
    drums: {
      ...patch.drums,
      steps: {
        ...patch.drums.steps,
        [lane]: patch.drums.steps[lane].map((v, i) =>
          i === index ? value : v,
        ),
      },
    },
  };
}

export function setBpm(patch: Patch, bpm: number): Patch {
  return { ...patch, bpm: Math.round(bpm) };
}

export function setSwing(patch: Patch, swing: number): Patch {
  const clamped = Math.max(0, Math.min(0.99, swing));
  return { ...patch, swing: clamped };
}

export function patchIsDirty(patch: Patch, factory: Patch): boolean {
  return JSON.stringify(patch) !== JSON.stringify(factory);
}
