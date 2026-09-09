import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("fader", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/groove/fader.tsx"),
    "utf8",
  );

  it("renders a slot, fill, and cap", () => {
    expect(source).toContain("groove-fader-slot");
    expect(source).toContain("groove-fader-fill");
    expect(source).toContain("groove-fader-cap");
  });

  it("treats shift as finer motion", () => {
    expect(source).toMatch(/shiftKey \? 500 : 150/);
  });
});
