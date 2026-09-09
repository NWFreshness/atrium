import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PATCHES } from "@/lib/groove/patches";

describe("transport", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/groove/transport.tsx"),
    "utf8",
  );

  it("renders a PLAY/STOP toggle button that matches /PLAY|STOP/", () => {
    expect(source).toContain('aria-label={p.playing ? "STOP" : "PLAY"}');
    expect(source).toContain('{p.playing ? "STOP" : "PLAY"}');
  });

  it("renders every factory patch as its own accessible button", () => {
    expect(source).toContain("p.patches.map");
    // Each patch button has aria-label = "<NAME> <SUBTITLE>". Subtitle is
    // interpolated at render time, so check the template structure instead
    // of literals.
    expect(source).toContain("`${patch.name} ${patch.subtitle}`");
    expect(source).toContain("groove-patch-btn-active");
  });

  it("renders a REVERT button that toggles between REVERT and SAVED", () => {
    expect(source).toContain('p.edited ? "REVERT" : "SAVED"');
    expect(source).toMatch(/disabled=\{!p\.edited\}/);
  });

  it("renders tempo + swing + master LEDs", () => {
    expect(source).toContain("TempoDial");
    expect(source).toContain("Knob");
    expect(source).toContain("LedStrip");
    expect(source).toMatch(/swing.*onChange=\{p\.onSwing\}/);
  });
});
