import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("knob", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/groove/knob.tsx"),
    "utf8",
  );

  it("renders a pointer, track, and label for the spec", () => {
    expect(source).toContain('className="groove-knob"');
    expect(source).toContain("groove-knob-track");
    expect(source).toContain("groove-knob-value");
    expect(source).toContain("groove-knob-label");
  });

  it("uses pointer events with shift-fine tuning", () => {
    expect(source).toMatch(/onPointerDown/);
    expect(source).toMatch(/onPointerMove/);
    expect(source).toMatch(/onPointerUp/);
    expect(source).toMatch(/shiftKey \? 620 : 190/);
  });

  it("snaps integer and selector specs", () => {
    expect(source).toMatch(/spec\.options \|\| spec\.integer/);
  });
});
