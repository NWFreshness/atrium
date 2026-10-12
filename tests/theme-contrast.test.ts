/**
 * Phase 10.7, re-based on the Phase 14 rack palette — computed WCAG contrast
 * from the shipped CSS. The 4.5 / 3.0 floors are unchanged.
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
  "--moss",
] as const;

const SURFACES = ["--bg-0", "--bg-1", "--bg-2", "--bg-3"] as const;

const INST_ROLES = [
  "--inst-ink",
  "--inst-dim",
  "--inst-faint",
  "--inst-brass",
] as const;

/**
 * Fill-only roles. `role` must stay `"fill"` — raising it to `"text"` fails
 * both this list pin and the 4.5 check. Both clear the 3:1 UI floor on the
 * rack palette, so neither needs a below-floor lock any more.
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
 * Pairs allowed below 4.5 at a locked number. Empty on the rack palette:
 * every text role clears the floor on every surface in both themes. The
 * mechanism stays so a future exception has to be named here.
 */
const TEXT_LOCKS: {
  theme: "dark" | "light";
  fg: (typeof TEXT_ROLES)[number];
  bg: (typeof SURFACES)[number];
  lock: number;
}[] = [];

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

describe("cream chassis warmth (Phase 14, replaces the 13.2 near-gray rule)", () => {
  // The light theme is a cream chassis on purpose, so its surface, text and
  // border tokens are warm: red >= green >= blue. That still rules out the
  // green cast 13.2 guarded against. The spread is capped so "warm" cannot
  // drift into a coloured surface. Accent and data roles keep their hues and
  // are excluded here.
  const WARM_ROLES = [
    "--bg-0",
    "--bg-1",
    "--bg-2",
    "--bg-3",
    "--ink",
    "--ink-dim",
    "--ink-faint",
    "--line",
    "--line-strong",
  ] as const;
  const MAX_SPREAD = 32;
  it.each([...WARM_ROLES])("%s is a warm neutral", (name) => {
    const { r, g, b } = tokenColor(light, name);
    expect(
      r,
      `${name} = rgb(${r}, ${g}, ${b}) is not warm`,
    ).toBeGreaterThanOrEqual(g);
    expect(
      g,
      `${name} = rgb(${r}, ${g}, ${b}) is not warm`,
    ).toBeGreaterThanOrEqual(b);
    const spread = r - b;
    expect(
      spread,
      `${name} = rgb(${r}, ${g}, ${b}) is a colour, not a neutral (spread ${spread})`,
    ).toBeLessThanOrEqual(MAX_SPREAD);
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

describe("shared focus ring (13.1 refresh)", () => {
  it("declares a single --focus-ring token in :root routed through --brass", () => {
    expect(dark).toMatch(/--focus-ring:\s*2px solid var\(--brass\)/);
  });

  it("keeps the routing target contrast-gated in both themes", () => {
    expect(dark).toContain("--brass:");
    expect(light).toContain("--brass:");
  });
});

describe("primary action pair (13.4 polish, Phase 14 tokens)", () => {
  // The amber fill and the ink it carries: the shared primary button and the
  // active nav block. Token facts, locked so a palette retune that drops the
  // primary below the text floor fails.
  it.each([
    { theme: "dark", fg: "--on-amber", bg: "--amber", lock: 9.82 },
    { theme: "light", fg: "--on-amber", bg: "--amber", lock: 8.12 },
  ])("$theme $fg text on $bg fill", ({ theme, fg, bg, lock }) => {
    const block = themeBlock(theme as "dark" | "light");
    const ratio = contrastRatio(tokenColor(block, fg), tokenColor(block, bg));
    expect(ratio, failMessage(fg, bg, ratio, lock)).toBeCloseTo(lock, 2);
    expect(ratio, failMessage(fg, bg, ratio, TEXT_MIN)).toBeGreaterThanOrEqual(
      TEXT_MIN,
    );
  });

  it("paints the stale-contact tone from a gated text role, not an undeclared token", () => {
    const org = readFileSync(resolve("components/crm/org.module.css"), "utf8");
    expect(org).not.toMatch(/var\(--cedar\)/);
    expect(org).toMatch(/\.crm-stale\s*\{[^}]*var\(--clay-ink\)/);
  });
});
