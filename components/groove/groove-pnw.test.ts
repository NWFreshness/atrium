/**
 * Phase 10.6 — the PNW instrument recast gate.
 *
 * Groove is the one screen the app theme does not reach: it keeps its own
 * `--inst-*` scope and stays instrument-dark under `data-theme="light"`. 5.6 shipped
 * that shape; this gate extends `groove-pass.test.ts` with the *values* the PNW
 * recast put in it, so a half-finished pass (a token left espresso, a stray brown
 * literal in a gradient, a unit accent that never moved) fails here rather than in
 * review.
 *
 * It also locks the two structural things the recast could quietly break: the
 * `:global` DOM contract the Groove smoke selects by class name, and the
 * stretch/margin-auto rule that keeps the four units level.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { UNIT_META } from "@/lib/groove/params";
import { PATCHES } from "@/lib/groove/patches";
import { UNIT_IDS } from "@/lib/groove/types";

const root = process.cwd();
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const shellCss = read("components/groove/groove-shell.module.css");
/** comments stripped: assertions about live rules must not trip on prose */
const shellRules = shellCss.replace(/\/\*[\s\S]*?\*\//g, "");
const shellTsx = read("components/groove/groove-shell.tsx");
const transport = read("components/groove/transport.tsx");
const master = read("components/groove/master.tsx");
const scope = read("components/groove/scope.tsx");
const unit = read("components/groove/unit.tsx");
const smoke = read("e2e/groove.spec.ts");
const workroom = read("e2e/workroom.spec.ts");

/** The spec's 15-row table, ported verbatim. */
const PNW_INSTRUMENT: Record<string, string> = {
  "--inst-deep": "#14181a",
  "--inst-bg": "#1b1f21",
  "--inst-panel": "#23282a",
  "--inst-panel-hi": "#2c3234",
  "--inst-line": "#3c4344",
  "--inst-line-soft": "#2b3133",
  "--inst-ink": "#eef1f2",
  "--inst-dim": "#b3bfa9",
  "--inst-faint": "#a3b19b",
  "--inst-brass": "#dfa84a",
  "--inst-brass-bright": "#efc272",
  "--inst-brass-deep": "#8a6320",
  "--inst-brass-glow": "rgba(223, 168, 74, 0.55)",
  "--inst-moss": "#a3b19b",
  "--inst-clay": "#b87355",
};

/** Whitespace- and leading-zero-insensitive, because prettier owns the write. */
const norm = (value: string) =>
  value
    .replace(/\s+/g, "")
    .replace(/(^|[(,])0\./g, "$1.")
    .toLowerCase();

function token(name: string): string {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(shellRules);
  return match ? norm(match[1]) : "";
}

/**
 * WCAG 2.1 relative-luminance contrast. Duplicated from the 10.7 gate on purpose:
 * 10.6 must not land a pair that gate then has to relax.
 */
function contrast(fg: string, bg: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

/** 5.6's espresso-era literals — 10.1/10.6 retired every one. */
const espresso = [
  "#0c0a07",
  "#131009",
  "#1a1510",
  "#231d14",
  "#3a3325",
  "#2b2419",
  "#f4ecdc",
  "#ab9c81",
  "#7d7159",
  "#dfa33c",
  "#f3c168",
  "#7d5713",
  "#8fae83",
  "#cd7258",
  "#a88fc0",
  "#ecad0a",
  "#221c13",
  "#17130d",
  "#100d08",
  "#6f5f42",
  "#2a2318",
  "#1b1610",
  "#241e15",
  "#18140e",
  "#262017",
  "#1c1710",
  "#16120c",
  "#262019",
  "#1a1610",
  "#241f18",
  "#191510",
  "#2c2517",
  "#2b2417",
  "#3e3016",
  "#4a3a1c",
  "#2f2513",
  "#7a5618",
  "#4d360f",
  "#f2e9d6",
  "#a89a80",
  "#c25a3d",
  "#8f3f28",
  "#fff3e4",
  "#ffe9c2",
  "#0a0806",
];

describe("Groove carries the PNW instrument values", () => {
  it("declares every --inst-* token with the value from the spec table", () => {
    for (const [name, value] of Object.entries(PNW_INSTRUMENT)) {
      expect(token(name), `${name} is not the PNW value`).toBe(norm(value));
    }
  });

  it("keeps the whole token block in one place, on the chassis", () => {
    // 10.7 parses the instrument block out of this file; a token declared in
    // three rules would silently escape that gate.
    const chassis = shellRules.slice(
      shellRules.indexOf(":global(.groove-chassis)"),
      shellRules.indexOf("}", shellRules.indexOf(":global(.groove-chassis)")),
    );
    for (const name of Object.keys(PNW_INSTRUMENT)) {
      expect(
        chassis,
        `${name} is declared outside the chassis block`,
      ).toContain(`${name}:`);
    }
  });

  it("leaves no espresso-era literal in the instrument stylesheet", () => {
    // The 5.6 token values plus every warm brown, cream, and amber hex the
    // chassis/units/scope painted with. Test files may name them; this file may not.
    for (const value of espresso) {
      expect(shellRules, `${value} is an espresso-era literal`).not.toContain(
        value,
      );
    }
    for (const value of ["244, 236, 220", "223, 163, 60", "205, 114, 88"]) {
      expect(shellRules, `rgba(${value}…) is espresso-era`).not.toContain(
        value,
      );
    }
  });

  it("never falls back to the app theme tokens", () => {
    // The instrument scope is nested, not a re-skin: a missing --inst-* value must
    // be a visible failure, not a silent inheritance from --bg-*/--ink. The guard
    // deliberately has no trailing `)`/`,` requirement — that weaker form let
    // var(--ink-dim), var(--line-strong) and var(--brass-soft) through.
    expect(shellRules).not.toMatch(
      /var\(--(?:bg-\d|ink|line|brass|moss|clay|slate|timber)/,
    );
  });

  it("keeps the espresso-era literals out of the desk components too", () => {
    /*
      The stylesheet scan above is not enough: the pre-5.6 amber #ecad0a survived
      10.6 in knob.tsx's `var(--groove-accent, #ecad0a)` fallback — a stale colour
      in the one place spec item 1 says must fail visibly. Scan the components.
    */
    const DESK = [
      "groove-shell.tsx",
      "transport.tsx",
      "unit.tsx",
      "master.tsx",
      "scope.tsx",
      "knob.tsx",
      "fader.tsx",
      "drum-grid.tsx",
      "note-grid.tsx",
      "velocity-lane.tsx",
      "led-strip.tsx",
    ];
    for (const file of DESK) {
      const src = read(`components/groove/${file}`);
      for (const value of espresso) {
        expect(
          src,
          `${file} still carries the espresso literal ${value}`,
        ).not.toContain(value);
      }
    }
  });
});

describe("Groove stays instrument-dark", () => {
  it("has no light-theme override in the stripped ruleset", () => {
    // The file's header comment names the absent override on purpose; only the live
    // ruleset matters, and 5.6 removed those overrides deliberately.
    expect(shellRules).not.toContain('[data-theme="light"]');
    expect(shellRules).not.toMatch(/@media[^{]*prefers-color-scheme/);
  });

  it("keeps the smoke's :global DOM contract", () => {
    expect(smoke).toContain(".groove-master-leds .groove-led");
    expect(smoke).toContain('className.includes("on")');
    for (const name of [
      "groove-shell",
      "groove-unit",
      "groove-master-leds",
      "groove-led",
      "groove-led-on",
    ]) {
      expect(shellCss, `:global(.${name}) is missing`).toContain(
        `:global(.${name})`,
      );
    }
    // Bare names must stay literal: hashing them silently breaks the smoke.
    for (const file of [
      "groove-shell.tsx",
      "transport.tsx",
      "unit.tsx",
      "master.tsx",
      "scope.tsx",
    ]) {
      expect(
        read(`components/groove/${file}`),
        `${file} must not hash its class names`,
      ).not.toContain("styles[");
    }
  });
});

describe("Groove hardware", () => {
  it("keeps the chassis, nameplate, and four corner screws", () => {
    expect(shellTsx).toContain('role="group"');
    expect(shellTsx).toContain('aria-label="Groovebox G-4"');
    expect(shellTsx).toContain("groove-nameplate");
    expect(
      (shellTsx.match(/groove-screw/g) ?? []).length,
    ).toBeGreaterThanOrEqual(4);
    expect(shellTsx).toContain('aria-hidden="true"');
  });

  it("keeps the four units level", () => {
    // Four units of unequal content still read as one rack: the deck stretches the
    // cards and the sequencer strip pins itself to the bottom.
    const deck = shellRules.slice(
      shellRules.indexOf(":global(.groove-deck)"),
      shellRules.indexOf("}", shellRules.indexOf(":global(.groove-deck)")),
    );
    expect(deck).toContain("align-items: stretch");

    const seq = shellRules.slice(
      shellRules.indexOf(":global(.groove-unit-seq)"),
      shellRules.indexOf("}", shellRules.indexOf(":global(.groove-unit-seq)")),
    );
    expect(seq).toContain("margin-top: auto");
  });

  it("keeps every unit and patch name from the domain", () => {
    expect(UNIT_META.drums).toEqual({ name: "RHYTHM", model: "DR-16" });
    expect(UNIT_META.bass).toEqual({ name: "BASS", model: "MB-1" });
    expect(UNIT_META.pads).toEqual({ name: "PADS", model: "PX-4" });
    expect(UNIT_META.lead).toEqual({ name: "LEAD", model: "LX-2" });
    expect(UNIT_IDS).toEqual(["drums", "bass", "pads", "lead"]);
    expect(PATCHES.map((p) => p.name)).toEqual([
      "NEON RIVIERA",
      "BASALT",
      "SUNROOM",
      "LATE ORBIT",
    ]);
    expect(unit).toContain("UNIT_META[id]");
    expect(unit).toContain("groove-unit-muted");
  });

  it("steps the unit accents through the PNW family", () => {
    const accent = (unitClass: string) => {
      const rule = shellRules.slice(
        shellRules.indexOf(`:global(.${unitClass})`),
        shellRules.indexOf("}", shellRules.indexOf(`:global(.${unitClass})`)),
      );
      return rule;
    };
    expect(accent("groove-unit-drums")).toContain("--unit-accent: #dfa84a");
    expect(accent("groove-unit-pads")).toContain("--unit-accent: #a3b19b");
    expect(accent("groove-unit-lead")).toContain(
      "--unit-accent: var(--inst-clay)",
    );
    // rain stays the value 10.1 put in the data palette
    expect(accent("groove-unit-bass")).toContain("--unit-accent: #8b9fc2");
  });
});

describe("Groove indicator contrast", () => {
  it("keeps the lit LED pair at or above the 3:1 UI threshold", () => {
    const brass = PNW_INSTRUMENT["--inst-brass"];
    const panel = PNW_INSTRUMENT["--inst-panel"];
    const ratio = contrast(brass, panel);
    // The one measured pair inside Groove (the spec records ~5.6:1).
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(token("--inst-brass")).toBe(norm(brass));
    expect(token("--inst-panel")).toBe(norm(panel));
  });

  it("distinguishes the unlit LED by shape, not colour alone", () => {
    const rule = (selector: string) => {
      const from = shellRules.indexOf(`:global(.${selector})`);
      return shellRules.slice(from, shellRules.indexOf("}", from));
    };
    // lit = PNW golden, unlit = panel line, and the unlit dot keeps its inset ring.
    expect(rule("groove-play-led")).toContain("var(--inst-line)");
    expect(rule("groove-play-led")).toContain("inset 0 0 0 1px");
    expect(rule("groove-play-led-on")).toContain("var(--inst-brass)");
    expect(rule("groove-led")).toContain("var(--inst-line)");
    expect(rule("groove-led")).toContain("inset 0 0 0 1px");
    expect(rule("groove-led-on")).toContain("var(--inst-brass)");
  });

  it("moves the knob arcs and the scope trace onto instrument ink and moss", () => {
    expect(shellRules).toContain("--groove-accent: var(--inst-ink)");
    expect(master).toContain("groove-vu");
    expect(master).toContain("getByteTimeDomainData");
    expect(scope).toContain('role="img"');
    // The trace is PNW moss, not the pre-5.6 amber #ecad0a.
    expect(scope).toMatch(/--inst-moss/);
    expect(scope).not.toContain("#ecad0a");
    expect(scope).not.toContain("236,173,10");
    expect(scope).not.toContain("236, 173, 10");
  });

  it("keeps the sweep meter golden and the VU tube's overload end clay", () => {
    expect(shellRules).toContain("background: var(--inst-brass)");
    const tube = shellRules.slice(
      shellRules.indexOf(":global(.groove-tube)"),
      shellRules.indexOf("}", shellRules.indexOf(":global(.groove-tube)")),
    );
    expect(tube).toContain("var(--inst-clay) 0%");
    expect(tube).toContain("var(--inst-brass) 34%");
    expect(tube).toContain("var(--inst-moss) 82%");
  });
});

describe("the Workroom smoke matches the recast", () => {
  it("asserts the PNW instrument values, not the espresso ones", () => {
    expect(workroom).toMatch(/chassis\.panel\)\.toBe\("#23282a"\)/);
    expect(workroom).toMatch(/chassis\.ink\)\.toBe\("#eef1f2"\)/);
    expect(workroom).toMatch(
      /chassis\.color\)\.toBe\("rgb\(238, 241, 242\)"\)/,
    );
    expect(workroom).not.toContain("#1a1510");
    expect(workroom).not.toContain("#f4ecdc");
    expect(workroom).not.toContain("rgb(244, 236, 220)");
  });
});
