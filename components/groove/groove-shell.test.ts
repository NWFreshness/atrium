import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PATCHES } from "@/lib/groove/patches";
import { UNIT_IDS } from "@/lib/groove/types";

describe("groove audio modules", () => {
  const audioFiles = ["engine.ts", "drums.ts", "synths.ts", "master.ts"];

  it.each(audioFiles)("%s is the engine side of a client boundary", (file) => {
    const path = resolve(process.cwd(), "lib/groove/audio", file);
    const source = readFileSync(path, "utf8");
    // Plain TS — the "use client" boundary sits at the shell that imports
    // it. Refusing "use server"/"use client" here is what keeps these
    // modules safe to bundle from anywhere.
    expect(source).not.toMatch(/^\s*"use server"/);
    expect(source).not.toMatch(/^\s*"use client"/);
  });

  it("no audio library added to package.json", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    );
    const deps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    const offenders = Object.keys(deps).filter((name) =>
      /tone|howler|soundjs|webmidi/i.test(name),
    );
    expect(offenders).toEqual([]);
  });

  it("schedule.ts exposes the two pure helpers the engine uses", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/groove/audio/schedule.ts"),
      "utf8",
    );
    expect(source).toContain("export function gapToNext");
    expect(source).toContain("export function sweepValue");
  });
});

describe("groove audio imports across the repo", () => {
  it("the server groove page does not import the engine", () => {
    const page = readFileSync(
      resolve(process.cwd(), "app/(authenticated)/groove/page.tsx"),
      "utf8",
    );
    expect(page).not.toMatch(/lib\/groove\/audio/);
  });

  it("groove-shell is the only client that imports the engine", () => {
    const shell = readFileSync(
      resolve(process.cwd(), "components/groove/groove-shell.tsx"),
      "utf8",
    );
    expect(shell).toContain('"use client"');
    expect(shell).toContain("@/lib/groove/audio/engine");
  });
});

describe("groove UI sources", () => {
  it("no UI file outside the engine imports from lib/groove/audio", () => {
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
      "transport.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(
        resolve(process.cwd(), "components/groove", file),
        "utf8",
      );
      if (file === "groove-shell.tsx") {
        expect(source).toContain("@/lib/groove/audio/engine");
      } else {
        expect(source).not.toMatch(/lib\/groove\/audio/);
      }
    }
  });

  it("factory patches remain usable as engine state", () => {
    expect(PATCHES).toHaveLength(4);
    for (const id of UNIT_IDS) {
      expect(PATCHES[0][id].params.level).toBeDefined();
    }
  });
});
