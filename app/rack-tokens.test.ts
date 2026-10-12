import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const theme = readFileSync(new URL("../lib/theme.ts", import.meta.url), "utf8");
const crmCharts = readFileSync(
  new URL("../components/crm/dashboard-charts.tsx", import.meta.url),
  "utf8",
);
const rolodexCharts = readFileSync(
  new URL("../components/rolodex/today-charts.tsx", import.meta.url),
  "utf8",
);

function block(css: string, start: string, end: string): string {
  const from = css.indexOf(start);
  expect(from, `missing ${start}`).toBeGreaterThanOrEqual(0);
  const to = css.indexOf(end, from);
  expect(to, `missing terminator ${end}`).toBeGreaterThan(from);
  return css.slice(from, to);
}

const dark = block(globals, ":root {", '[data-theme="light"]');
const light = block(globals, '[data-theme="light"] {', "/* ---------- Base");

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const channels = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function tokenHex(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  expect(match, `${name} hex missing`).toBeTruthy();
  return match![1].toLowerCase();
}

describe("rack role table (verbatim)", () => {
  it("declares every dark (basalt chassis) role hex", () => {
    expect(dark).toContain("--bg-0: #14171a");
    expect(dark).toContain("--bg-1: #191d21");
    expect(dark).toContain("--bg-2: #1f2428");
    expect(dark).toContain("--bg-3: #272d32");
    expect(dark).toContain("--line: #2c3236");
    expect(dark).toContain("--line-strong: #3d454a");
    expect(dark).toContain("--grid: #1a1e22");
    expect(dark).toContain("--ink: #dfe5e3");
    expect(dark).toContain("--ink-dim: #a4afac");
    expect(dark).toContain("--ink-faint: #8f9b98");
    expect(dark).toContain("--brass: #ffb000");
    expect(dark).toContain("--brass-bright: #ffc640");
    expect(dark).toContain("--brass-deep: #a06a00");
    expect(dark).toContain("--amber: #ffb000");
    expect(dark).toContain("--on-amber: #14171a");
    expect(dark).toContain("--clay: #c7513d");
    expect(dark).toContain("--clay-ink: #ff7a66");
    expect(dark).toContain("--moss: #58e08c");
    expect(dark).toContain("--slate: #7fb2ff");
    expect(dark).toContain("--timber: #c2b8a3");
    expect(dark).toContain("--led-off: #3a4246");
  });

  it("declares every light (cream chassis) role hex — derived, not copied from dark", () => {
    expect(light).toContain("--bg-0: #e4dfd0");
    expect(light).toContain("--bg-1: #ece8db");
    expect(light).toContain("--bg-2: #f3f0e6");
    expect(light).toContain("--bg-3: #faf8f1");
    expect(light).toContain("--line: #c9c2ae");
    expect(light).toContain("--line-strong: #a39b85");
    expect(light).toContain("--grid: #dbd5c5");
    expect(light).toContain("--ink: #1d1c1a");
    expect(light).toContain("--ink-dim: #46453e");
    expect(light).toContain("--ink-faint: #585750");
    expect(light).toContain("--brass: #754b00");
    expect(light).toContain("--brass-bright: #f0a400");
    expect(light).toContain("--brass-deep: #5e3c00");
    expect(light).toContain("--amber: #f0a400");
    expect(light).toContain("--on-amber: #1d1c1a");
    expect(light).toContain("--clay: #9c2c18");
    expect(light).toContain("--clay-ink: #9c2c18");
    expect(light).toContain("--moss: #17613a");
    expect(light).toContain("--slate: #234f99");
    expect(light).toContain("--timber: #57503f");
    expect(light).toContain("--led-off: #b9b2a0");
    expect(light).not.toContain("--brass: #ffb000");
    expect(light).not.toContain("--ink-faint: #8f9b98");
    expect(light).not.toContain("--moss: #58e08c");
  });

  it("keeps --violet retired and good/warn/bad/led on the signal roles", () => {
    expect(globals).not.toMatch(/--violet\s*:/);
    expect(dark).toContain("--clay-ink:");
    expect(dark).toContain("--timber:");
    expect(dark).toContain("--good: var(--moss)");
    expect(dark).toContain("--warn: var(--brass)");
    expect(dark).toContain("--bad: var(--clay-ink)");
    expect(dark).toContain("--led: var(--moss)");
  });

  it("keeps the usage rules in the token block as comments", () => {
    expect(dark).toMatch(/one highlight per screen/i);
    expect(dark).toMatch(/LEDs carry status/i);
    expect(dark).toMatch(/mono is chrome/i);
  });
});

describe("type stack and scale", () => {
  it("maps semantic font tokens to JetBrains Mono (chrome) and IBM Plex Sans (content)", () => {
    expect(globals).toMatch(/--font-display:\s*var\(--font-jetbrains-mono\)/);
    expect(globals).toContain("--font-sans: var(--font-plex-sans)");
    expect(globals).toMatch(/--font-mono:\s*var\(--font-jetbrains-mono\)/);
    expect(globals).toContain("Helvetica Neue");
    expect(globals).toContain("ui-monospace");
  });

  it("declares the measured type-scale tokens", () => {
    expect(globals).toContain("--text-display: clamp(1.7rem, 3.4vw, 2.4rem)");
    expect(globals).toContain("--text-h1: clamp(1.4rem, 2.3vw, 1.8rem)");
    expect(globals).toContain("--text-h2: clamp(1.1rem, 1.7vw, 1.3rem)");
    expect(globals).toContain("--text-h3: 0.95rem");
    expect(globals).toContain("--text-body: 0.9375rem");
    expect(globals).toContain("--text-small: 0.84rem");
    expect(globals).toContain("--text-label: 0.64rem");
    expect(globals).toContain("--text-data: 0.8rem");
    expect(globals).toContain("--text-kpi: 1.5rem");
    expect(globals).toContain("--measure: 68ch");
    expect(globals).toContain("--measure-lede: 60ch");
    expect(globals).toContain("--text-display-weight: 700");
    expect(globals).toContain("--text-h1-weight: 700");
    expect(globals).toContain("--text-h2-weight: 700");
    expect(globals).toContain("--text-h3-weight: 700");
    expect(globals).toContain("--text-body-weight: 400");
    expect(globals).toContain("--text-kpi-weight: 500");
    expect(globals).toContain("--text-display-tracking: 0.04em");
    expect(globals).toContain("--text-label-tracking: 0.14em");
    expect(globals).toContain("--text-display-leading: 1.08");
    expect(globals).toContain("--text-h1-leading: 1.15");
    expect(globals).toContain("--text-h2-leading: 1.2");
    expect(globals).toContain("--text-h3-leading: 1.3");
    expect(globals).toMatch(/--text-body-leading:\s*1\.6/);
    expect(globals).toContain("--text-small-leading: 1.55");
    expect(globals).toMatch(/uppercase/);
    expect(globals).toContain("tabular-nums");
  });

  it("loads JetBrains Mono and IBM Plex Sans through next/font with distinct variable names", () => {
    expect(layout).toContain('from "next/font/google"');
    expect(layout).toContain("JetBrains_Mono");
    expect(layout).toContain("IBM_Plex_Sans");
    expect(layout).not.toContain("Outfit");
    expect(layout).not.toContain("Archivo");
    expect(layout).not.toContain("Fraunces");
    expect(layout).toContain('variable: "--font-jetbrains-mono"');
    expect(layout).toContain('variable: "--font-plex-sans"');
    expect(layout).toContain("THEME_INIT_SCRIPT");
  });
});

describe("geometry, overlays, motion", () => {
  it("machines the radii down and flattens the panel shadow", () => {
    expect(globals).toContain("--r-sm: 2px");
    expect(globals).toContain("--r-md: 3px");
    expect(globals).toContain("--r-lg: 4px");
    expect(dark).toMatch(/--shadow-panel:\s*inset/);
    expect(light).toMatch(/--shadow-panel:\s*inset/);
  });

  it("keeps the grain and lays static grid paper under the panels", () => {
    expect(globals).toContain("body::before");
    expect(globals).toContain("fractalNoise");
    // Dark default carries the fuller grain; the cream chassis quiets it.
    expect(globals).toMatch(/body::before \{[\s\S]*?opacity:\s*0\.05/);
    expect(globals).toMatch(
      /\[data-theme="light"\] body::before[\s\S]*?opacity:\s*0\.035/,
    );
    // The grid is the body's own background. A positioned overlay would paint
    // over unpositioned chrome (the Space sidebar), so there is no body::after.
    const from = globals.indexOf("\nbody {\n  margin: 0;");
    expect(from, "missing the body rule").toBeGreaterThan(-1);
    const body = globals.slice(from, globals.indexOf("}", from));
    expect(body).toContain("var(--grid)");
    expect(body).toContain("background-size: 20px 20px");
    expect(body).not.toContain("animation");
    expect(globals).not.toContain("body::after");
    // Paper does not move: the Phase 10 sky drift is gone, not paused.
    expect(globals).not.toContain("sky-drift");
  });

  it("gates the remaining motion under reduced motion", () => {
    expect(globals).toContain("calc(var(--i, 0) * 70ms)");
    const mediaStart = globals.indexOf(
      "@media (prefers-reduced-motion: reduce)",
    );
    expect(mediaStart).toBeGreaterThan(-1);
    const media = globals.slice(mediaStart);
    expect(media).toMatch(/\.reveal\s*\{[^}]*animation:\s*none/);
    expect(media).toContain("transition-duration: 0.01ms !important");
  });

  it("draws the grid from a token each theme declares, so it follows the theme", () => {
    expect(dark).toMatch(/--grid:\s*#[0-9a-f]{6}/);
    expect(light).toMatch(/--grid:\s*#[0-9a-f]{6}/);
    expect(tokenHex(dark, "--grid")).not.toBe(tokenHex(light, "--grid"));
  });
});

describe("contrast claims (text roles)", () => {
  it("dark text roles clear 4.5:1 against --bg-2, slate and led green included", () => {
    const bg2 = tokenHex(dark, "--bg-2");
    const textRoles = [
      "--ink",
      "--ink-dim",
      "--ink-faint",
      "--brass",
      "--brass-bright",
      "--clay-ink",
      "--timber",
      "--slate",
      "--moss",
    ];
    for (const name of textRoles) {
      const ratio = contrast(tokenHex(dark, name), bg2);
      expect(
        ratio,
        `${name} on --bg-2 = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("light text roles clear 4.5:1 against the darkest cream surface (brass-bright is fill-only)", () => {
    const cream = tokenHex(light, "--bg-0");
    const textRoles = [
      "--ink",
      "--ink-dim",
      "--ink-faint",
      "--brass",
      "--brass-deep",
      "--clay",
      "--clay-ink",
      "--moss",
      "--slate",
      "--timber",
    ];
    for (const name of textRoles) {
      const ratio = contrast(tokenHex(light, name), cream);
      expect(
        ratio,
        `${name} on --bg-0 = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    // Bright amber cannot be ink on cream: it is a fill, and --brass is the ink.
    expect(contrast(tokenHex(light, "--brass-bright"), cream)).toBeLessThan(3);
  });

  it("amber fills always carry readable --on-amber text", () => {
    for (const block of [dark, light]) {
      const ratio = contrast(
        tokenHex(block, "--on-amber"),
        tokenHex(block, "--amber"),
      );
      expect(
        ratio,
        `--on-amber on --amber = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("chart series and aliases", () => {
  it("keeps --background/--foreground aliases", () => {
    expect(globals).toContain("--background: var(--bg-0)");
    expect(globals).toContain("--foreground: var(--ink)");
  });

  it("paints both chart files from the signal tokens, with no pinned hex", () => {
    const expected = [
      "var(--moss)",
      "var(--clay-ink)",
      "var(--slate)",
      "var(--timber)",
      "var(--brass)",
    ];
    for (const src of [crmCharts, rolodexCharts]) {
      for (const token of expected) {
        expect(src).toContain(token);
      }
      expect(src).not.toMatch(/"#[0-9a-fA-F]{6}"/);
    }
  });
});

describe("dark-first default with a persisted toggle (Phase 14)", () => {
  it("mounts the pre-paint init script in the root layout", () => {
    expect(layout).toContain("THEME_INIT_SCRIPT");
  });

  it("falls back to dark for first visits and malformed stored values", () => {
    expect(theme).toContain('t="dark"');
    expect(theme).toMatch(/if\(t!=="light"&&t!=="dark"\)/);
  });

  it("persists the toggle client-side without following the OS preference", () => {
    expect(theme).toContain('THEME_STORAGE_KEY = "atrium.theme"');
    expect(theme).toContain("localStorage.getItem");
    expect(theme).toContain("setItem(THEME_STORAGE_KEY, next)");
    expect(theme).not.toContain("matchMedia(");
  });
});
