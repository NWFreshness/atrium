import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STEPS } from "@/lib/groove/types";

describe("led-strip", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/groove/led-strip.tsx"),
    "utf8",
  );

  it("renders 16 LEDs", () => {
    expect(source).toContain("Array.from({ length: STEPS }");
    expect(STEPS).toBe(16);
  });

  it("lights only the active step", () => {
    expect(source).toContain("groove-led-on");
    expect(source).toMatch(/i === current/);
  });

  it("stays out of the a11y tree", () => {
    expect(source).toContain('role="presentation"');
  });
});
