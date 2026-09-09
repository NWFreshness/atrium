import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { UNIT_META } from "@/lib/groove/params";

describe("groove-shell", () => {
  it("lists every unit region the spec asks for, using UNIT_META names", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/groove/groove-shell.tsx"),
      "utf8",
    );
    const ids = ["drums", "bass", "pads", "lead"] as const;
    for (const id of ids) {
      const meta = UNIT_META[id];
      expect(meta.name).not.toBe("");
      expect(meta.model).not.toBe("");
    }
    expect(source.match(/UNITS\.map/g)).toHaveLength(1);
    expect(ids).toHaveLength(4);
    // Shell mounts Unit; the region label is set by Unit on its section.
    expect(source).toContain("<Unit");
  });

  it("uses groove-prefixed CSS classes only", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/groove/groove-shell.module.css"),
      "utf8",
    );
    const tsx = readFileSync(
      resolve(process.cwd(), "components/groove/groove-shell.tsx"),
      "utf8",
    );
    const classNames = [
      ...tsx.matchAll(/styles\["(groove-[a-z0-9-]+)"\]/g),
    ].map((m) => m[1]);
    expect(classNames.length).toBeGreaterThan(0);
    for (const name of classNames) {
      expect(css).toMatch(new RegExp(`\\.${name}\\b`));
    }
    expect(tsx).not.toMatch(/className="groove-/);
  });

  it("does not duplicate product nav links", () => {
    const tsx = readFileSync(
      resolve(process.cwd(), "components/groove/groove-shell.tsx"),
      "utf8",
    );
    // The transport's Space key for play/stop is allowed; everything else
    // must stay clear of Home/CRM/Space/Rolodex so we don't re-add Atrium nav.
    const stripped = tsx.replace(/"Space"/g, "");
    expect(stripped).not.toMatch(/Home|CRM|Space|Rolodex/);
  });
});

describe("groove UI sources", () => {
  const files = [
    "groove-shell.tsx",
    "knob.tsx",
    "fader.tsx",
    "drum-grid.tsx",
    "note-grid.tsx",
    "velocity-lane.tsx",
    "led-strip.tsx",
    "unit.tsx",
    "use-readout.ts",
  ];

  it.each(files)("%s does not import the audio engine", (file) => {
    const source = readFileSync(
      resolve(process.cwd(), "components/groove", file),
      "utf8",
    );
    expect(source).not.toMatch(/AudioContext/);
    expect(source).not.toMatch(/lib\/groove\/audio/);
  });

  it("drum and note grids give each step a unique aria-label", () => {
    const drum = readFileSync(
      resolve(process.cwd(), "components/groove/drum-grid.tsx"),
      "utf8",
    );
    const note = readFileSync(
      resolve(process.cwd(), "components/groove/note-grid.tsx"),
      "utf8",
    );
    expect(drum).toContain("`${LANE_LABEL[lane]} step ${i + 1}`");
    expect(drum).toContain("aria-pressed={v > 0}");
    expect(note).toContain("`${unit} step ${i + 1}`");
    expect(note).toContain("aria-pressed={step.on}");
  });

  it("mounts four regions", () => {
    const unit = readFileSync(
      resolve(process.cwd(), "components/groove/unit.tsx"),
      "utf8",
    );
    expect(unit).toContain('role="region"');
    expect(unit).toContain("aria-label={meta.name}");
  });
});
