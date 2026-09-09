import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DRUM_LANES, STEPS } from "@/lib/groove/types";

describe("drum-grid", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/groove/drum-grid.tsx"),
    "utf8",
  );

  it("emits one row per lane and one button per step", () => {
    expect(source).toContain("DRUM_LANES.map");
    expect(source).toContain("Array.from({ length: STEPS }");
    expect(STEPS).toBe(16);
    expect(DRUM_LANES).toHaveLength(6);
  });

  it("uses KICK / SNARE / CLAP / C HAT / O HAT / PERC labels", () => {
    expect(source).toMatch(/kick:\s*"KICK"/);
    expect(source).toMatch(/snare:\s*"SNARE"/);
    expect(source).toMatch(/clap:\s*"CLAP"/);
    expect(source).toMatch(/hat:\s*"C HAT"/);
    expect(source).toMatch(/ohat:\s*"O HAT"/);
    expect(source).toMatch(/perc:\s*"PERC"/);
  });

  it("gives KICK step 3 a unique aria-label and aria-pressed", () => {
    expect(source).toContain("`${LANE_LABEL[lane]} step ${i + 1}`");
    expect(source).toContain("aria-pressed={v > 0}");
  });

  it("cycles rest → hit → accent on click", () => {
    expect(source).toMatch(/next = \(v \+ 1\) % 3/);
  });

  it("paints on drag without dropping steps", () => {
    expect(source).toMatch(/paint\.current = next/);
    expect(source).toMatch(/if \(dragging && paint\.current !== null\)/);
  });
});
