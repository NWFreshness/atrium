import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CHORD_SHAPES, NOTE_MAX, NOTE_MIN } from "./music";
import { PATCHES, clonePatch } from "./patches";
import { DRUM_LANES, STEPS, UNIT_IDS } from "./types";

const MELODIC = ["bass", "pads", "lead"] as const;

describe("the shipped patches", () => {
  it("ships four named Bench factory patches", () => {
    expect(PATCHES.map((p) => p.name)).toEqual([
      "NEON RIVIERA",
      "BASALT",
      "SUNROOM",
      "LATE ORBIT",
    ]);
    expect(PATCHES.map((p) => p.bpm)).toEqual([112, 130, 94, 126]);
    for (const patch of PATCHES) {
      expect(patch.subtitle).not.toBe("");
    }
  });

  it("sits in a playable tempo range with sane swing", () => {
    for (const patch of PATCHES) {
      expect(patch.bpm).toBeGreaterThanOrEqual(60);
      expect(patch.bpm).toBeLessThanOrEqual(200);
      expect(patch.swing).toBeGreaterThanOrEqual(0);
      expect(patch.swing).toBeLessThan(1);
    }
  });

  it("gives every drum lane exactly one bar of steps", () => {
    for (const patch of PATCHES) {
      for (const lane of DRUM_LANES) {
        const steps = patch.drums.steps[lane];
        expect(steps).toHaveLength(STEPS);
        for (const step of steps) expect([0, 1, 2]).toContain(step);
      }
    }
  });

  it("gives every melodic unit one bar of in-range notes", () => {
    for (const patch of PATCHES) {
      for (const unit of MELODIC) {
        const steps = patch[unit].steps;
        expect(steps).toHaveLength(STEPS);
        for (const step of steps) {
          expect(step.note).toBeGreaterThanOrEqual(NOTE_MIN);
          expect(step.note).toBeLessThanOrEqual(NOTE_MAX);
          expect(step.vel).toBeGreaterThan(0);
          expect(step.vel).toBeLessThanOrEqual(1);
          expect(step.chord).toBeGreaterThanOrEqual(0);
          expect(step.chord).toBeLessThan(CHORD_SHAPES.length);
        }
      }
    }
  });

  it("has something to play: no unit is entirely silent across the set", () => {
    for (const patch of PATCHES) {
      const drumHits = DRUM_LANES.flatMap(
        (lane) => patch.drums.steps[lane],
      ).filter((s) => s > 0);
      expect(drumHits.length).toBeGreaterThan(0);
      for (const unit of MELODIC) {
        expect(patch[unit].steps.some((s) => s.on)).toBe(true);
      }
    }
  });

  it("carries params for every unit plus the master bus", () => {
    for (const patch of PATCHES) {
      for (const unit of UNIT_IDS) {
        expect(Object.keys(patch[unit].params).length).toBeGreaterThan(0);
      }
      expect(Object.keys(patch.master).length).toBeGreaterThan(0);
    }
  });
});

describe("clonePatch", () => {
  it("hands back a deep copy, so editing one does not touch the original", () => {
    const original = PATCHES[0];
    const copy = clonePatch(original);
    expect(copy).toEqual(original);

    copy.bpm = original.bpm + 10;
    copy.drums.steps.kick[0] = original.drums.steps.kick[0] === 0 ? 2 : 0;
    copy.bass.steps[0].note = original.bass.steps[0].note + 1;

    expect(original.bpm).not.toBe(copy.bpm);
    expect(original.drums.steps.kick[0]).not.toBe(copy.drums.steps.kick[0]);
    expect(original.bass.steps[0].note).not.toBe(copy.bass.steps[0].note);
  });
});

describe("domain files", () => {
  it("stay free of AudioContext and Drizzle", () => {
    for (const file of [
      "types.ts",
      "music.ts",
      "filter.ts",
      "params.ts",
      "patches.ts",
    ]) {
      const source = readFileSync(
        resolve(process.cwd(), "lib/groove", file),
        "utf8",
      );
      expect(source).not.toMatch(/AudioContext/);
      expect(source).not.toMatch(/drizzle/i);
    }
  });
});
