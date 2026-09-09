import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CHORD_SHAPES, NOTE_MAX, NOTE_MIN } from "@/lib/groove/music";
import { STEPS } from "@/lib/groove/types";

describe("note-grid", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/groove/note-grid.tsx"),
    "utf8",
  );

  it("emits 16 steps with the unit name in the aria-label", () => {
    expect(STEPS).toBe(16);
    expect(source).toContain("`${unit} step ${i + 1}`");
  });

  it("toggles on click, drags to change pitch, scrolls to step", () => {
    expect(source).toMatch(/const next = \{ \.\.\.step, on: !step\.on \}/);
    expect(source).toMatch(/semis = Math\.round\(\(d\.y - e\.clientY\) \/ 8\)/);
    expect(source).toMatch(/onWheel/);
  });

  it("clamps notes to the playable range", () => {
    expect(source).toContain("clampNote(step.note");
    expect(NOTE_MIN).toBeLessThan(NOTE_MAX);
  });

  it("cycles chord shape on shift-click when showChord is on", () => {
    expect(source).toMatch(/showChord && e\.shiftKey/);
    expect(source).toMatch(/\(step\.chord \+ 1\) % CHORD_SHAPES\.length/);
    expect(CHORD_SHAPES.length).toBeGreaterThan(1);
  });
});
