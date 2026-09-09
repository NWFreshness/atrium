import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { UNIT_META, UNIT_PARAMS } from "@/lib/groove/params";
import { DRUM_LANES, STEPS, UNIT_IDS } from "@/lib/groove/types";

describe("unit", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/groove/unit.tsx"),
    "utf8",
  );

  it("wraps content in a role=region with the unit name", () => {
    expect(source).toContain('role="region"');
    expect(source).toContain("aria-label={meta.name}");
    expect(source).toContain("UNIT_META");
  });

  it("renders every spec declared in UNIT_PARAMS for its unit", () => {
    for (const id of UNIT_IDS) {
      const specs = UNIT_PARAMS[id];
      expect(specs.length).toBeGreaterThan(0);
    }
    expect(source).toMatch(/specs\.filter\(\(s\) => s\.kind === "knob"\)/);
    expect(source).toMatch(/specs\.filter\(\(s\) => s\.kind === "slider"\)/);
  });

  it("shows the drum grid for drums and the note grid + velocity for the rest", () => {
    expect(source).toMatch(/id === "drums" \? \(/);
    expect(source).toContain("<DrumGrid");
    expect(source).toContain("<NoteGrid");
    expect(source).toContain("<VelocityLane");
  });

  it("shows the chord shape on pads only", () => {
    expect(source).toMatch(/showChord=\{id === "pads"\}/);
  });

  it("marks the muted class when the unit is muted", () => {
    expect(source).toContain("groove-unit-muted");
  });

  it("renders 16 steps for drum lanes and melodic units", () => {
    expect(DRUM_LANES).toHaveLength(6);
    expect(STEPS).toBe(16);
  });

  it("names every unit the spec asks for", () => {
    expect(UNIT_META.drums.name).toBe("RHYTHM");
    expect(UNIT_META.bass.name).toBe("BASS");
    expect(UNIT_META.pads.name).toBe("PADS");
    expect(UNIT_META.lead.name).toBe("LEAD");
  });
});
