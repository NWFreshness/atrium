import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FILTER_SPEC, MASTER_GROUPS, MASTER_PARAMS } from "@/lib/groove/params";
import { filterGainAt, filterLabel } from "@/lib/groove/filter";

describe("scope", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/groove/scope.tsx"),
    "utf8",
  );

  it("renders a canvas that hosts the spectrum + filter overlay", () => {
    expect(source).toContain("<canvas");
    expect(source).toContain('className="groove-scope-canvas"');
  });

  it("draws the spectrum using getByteFrequencyData on the analyser", () => {
    expect(source).toContain("getByteFrequencyData(bins)");
    expect(source).toMatch(/MIN_HZ\s*\*\s*Math\.pow/);
  });

  it("uses filterGainAt for the live filter curve", () => {
    expect(source).toContain("filterGainAt(macro, reso, f)");
    // Sanity-check the helper still works without an audio context.
    expect(filterGainAt(0.5, 0, 1000)).toBeCloseTo(1, 6);
    expect(filterLabel(0.5)).toBe("OPEN");
  });

  it("is an img role for screen readers", () => {
    expect(source).toContain('role="img"');
  });
});

describe("master param coverage", () => {
  it("MASTER_PARAMS includes FILTER_SPEC and every group spec", () => {
    const keys = MASTER_PARAMS.map((s) => s.key);
    expect(keys).toContain(FILTER_SPEC.key);
    for (const group of MASTER_GROUPS) {
      for (const spec of group.specs) expect(keys).toContain(spec.key);
    }
  });
});
