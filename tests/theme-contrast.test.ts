/**
 * Phase 10.7 — computed WCAG contrast from the shipped CSS.
 *
 * Reads `app/globals.css` (`:root` and `[data-theme="light"]`) and the
 * instrument block in `components/groove/groove-shell.module.css`. A renamed
 * token fails with "token missing" rather than skipping the pair. Thresholds
 * are per role; fill-only downgrades live in FILL_EXCEPTIONS so relaxing one
 * is an edit to that list, not to the 4.5 / 3.0 numbers.
 *
 * CSS last-declaration wins: comments are stripped, then the last `--name:`
 * in the block is the value (a duplicate after the mist `--brass` is the
 * second injection probe).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globals = readFileSync(resolve("app/globals.css"), "utf8");
const grooveShell = readFileSync(
  resolve("components/groove/groove-shell.module.css"),
  "utf8",
);

const TEXT_MIN = 4.5;
const FILL_MIN = 3.0;

const TEXT_ROLES = [
  "--ink",
  "--ink-dim",
  "--ink-faint",
  "--brass",
  "--clay-ink",
  "--slate",
  "--timber",
] as const;

const SURFACES = ["--bg-0", "--bg-1", "--bg-2", "--bg-3"] as const;

const INST_ROLES = [
  "--inst-ink",
  "--inst-dim",
  "--inst-faint",
  "--inst-brass",
] as const;

/**
 * Spec-named fill exceptions. `role` must stay `"fill"` — raising it to
 * `"text"` is the fourth injection probe and fails both this list pin and
 * the 4.5 check.
 *
 * Dark `--brass-deep` on `--bg-0` is 2.75 in the 10.1 table (gradient only),
 * below the UI 3:1 floor, so that pair is locked rather than held to 3.0.
 */
const FILL_EXCEPTIONS: {
  theme: "dark";
  fg: "--brass-deep" | "--clay";
  bg: "--bg-0";
  role: "fill" | "text";
}[] = [
  { theme: "dark", fg: "--brass-deep", bg: "--bg-0", role: "fill" },
  { theme: "dark", fg: "--clay", bg: "--bg-0", role: "fill" },
];

/**
 * 10.1 table numbers this gate must not lift. Locked to two decimals so a
 * silent drop still fails. `--ink-faint` vs dark `--bg-3` measures 4.496,
 * which the table prints as 4.50.
 */
const TEXT_LOCKS: {
  theme: "dark";
  fg: (typeof TEXT_ROLES)[number];
  bg: (typeof SURFACES)[number];
  lock: number;
}[] = [
  { theme: "dark", fg: "--slate", bg: "--bg-2", lock: 4.33 },
  { theme: "dark", fg: "--slate", bg: "--bg-3", lock: 3.78 },
  { theme: "dark", fg: "--timber", bg: "--bg-3", lock: 4.49 },
  { theme: "dark", fg: "--ink-faint", bg: "--bg-3", lock: 4.5 },
];

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function cssBlock(source: string, openAt: string): string {
  const from = source.indexOf(openAt);
  expect(from, `token missing: block ${openAt}`).toBeGreaterThanOrEqual(0);
  const brace = source.indexOf("{", from);
  expect(brace, `token missing: block ${openAt}`).toBeGreaterThan(from);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(brace + 1, i);
    }
  }
  throw new Error(`token missing: unclosed block ${openAt}`);
}

const dark = cssBlock(globals, ":root");
const light = cssBlock(globals, '[data-theme="light"]');
const instrument = cssBlock(grooveShell, ".groove-chassis");

type Rgb = { r: number; g: number; b: number; a: number };

function parseColor(raw: string, token: string): Rgb {
  const hex = raw.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const h = hex[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgba = raw.match(
    /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i,
  );
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: Number(rgba[4]),
    };
  }
  throw new Error(`token missing: ${token} (unparsed ${raw})`);
}

function tokenColor(block: string, name: string): Rgb {
  const stripped = stripComments(block);
  const matches = [
    ...stripped.matchAll(new RegExp(`${name}\\s*:\\s*([^;]+);`, "g")),
  ];
  if (matches.length === 0) {
    throw new Error(`token missing: ${name}`);
  }
  return parseColor(matches[matches.length - 1][1].trim(), name);
}

function composite(fg: Rgb, bg: Rgb): Rgb {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: Rgb, bg: Rgb): number {
  const solid = fg.a < 1 ? composite(fg, bg) : fg;
  const l1 = relativeLuminance(solid);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function failMessage(
  fg: string,
  bg: string,
  ratio: number,
  need: number,
): string {
  return `${fg} on ${bg} = ${ratio.toFixed(2)}:1 (need ${need})`;
}

function themeBlock(theme: "dark" | "light"): string {
  return theme === "dark" ? dark : light;
}

function textLock(
  theme: "dark" | "light",
  fg: string,
  bg: string,
): number | undefined {
  return TEXT_LOCKS.find(
    (ex) => ex.theme === theme && ex.fg === fg && ex.bg === bg,
  )?.lock;
}

describe("declared text pairs (both themes)", () => {
  it.each(
    (["dark", "light"] as const).flatMap((theme) =>
      TEXT_ROLES.flatMap((fg) => SURFACES.map((bg) => ({ theme, fg, bg }))),
    ),
  )("$theme $fg on $bg", ({ theme, fg, bg }) => {
    const block = themeBlock(theme);
    const ratio = contrastRatio(tokenColor(block, fg), tokenColor(block, bg));
    const lock = textLock(theme, fg, bg);
    if (lock !== undefined) {
      expect(ratio, failMessage(fg, bg, ratio, lock)).toBeCloseTo(lock, 2);
      return;
    }
    expect(ratio, failMessage(fg, bg, ratio, TEXT_MIN)).toBeGreaterThanOrEqual(
      TEXT_MIN,
    );
  });
});

describe("named fill-only exceptions", () => {
  it("lists --brass-deep and --clay on dark --bg-0 as fill", () => {
    expect(FILL_EXCEPTIONS).toEqual([
      { theme: "dark", fg: "--brass-deep", bg: "--bg-0", role: "fill" },
      { theme: "dark", fg: "--clay", bg: "--bg-0", role: "fill" },
    ]);
  });

  it.each(FILL_EXCEPTIONS)("$theme $fg on $bg ($role)", (ex) => {
    const block = themeBlock(ex.theme);
    const ratio = contrastRatio(
      tokenColor(block, ex.fg),
      tokenColor(block, ex.bg),
    );
    const need = ex.role === "text" ? TEXT_MIN : FILL_MIN;
    if (ex.fg === "--brass-deep" && ex.role === "fill") {
      expect(ratio, failMessage(ex.fg, ex.bg, ratio, 2.75)).toBeCloseTo(
        2.75,
        2,
      );
      return;
    }
    expect(
      ratio,
      failMessage(ex.fg, ex.bg, ratio, need),
    ).toBeGreaterThanOrEqual(need);
  });
});

describe("instrument scope", () => {
  it.each(INST_ROLES)("%s on --inst-panel", (fg) => {
    const ratio = contrastRatio(
      tokenColor(instrument, fg),
      tokenColor(instrument, "--inst-panel"),
    );
    expect(
      ratio,
      failMessage(fg, "--inst-panel", ratio, TEXT_MIN),
    ).toBeGreaterThanOrEqual(TEXT_MIN);
  });
});
