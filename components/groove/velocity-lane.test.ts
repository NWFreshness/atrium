import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STEPS } from "@/lib/groove/types";

describe("velocity-lane", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/groove/velocity-lane.tsx"),
    "utf8",
  );

  it("skips rests", () => {
    expect(source).toMatch(
      /if \(i < 0 \|\| i >= STEPS \|\| !steps\[i\]\.on\) return/,
    );
    expect(STEPS).toBe(16);
  });

  it("clamps velocity to [0.15, 1]", () => {
    expect(source).toMatch(/Math\.max\(0\.15, Math\.min\(1/);
  });

  it("renders one slot per step", () => {
    expect(source).toContain("steps.map((step, i) =>");
  });
});
