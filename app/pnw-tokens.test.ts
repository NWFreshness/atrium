import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
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

describe("PNW role table (verbatim)", () => {
  it("declares every dark (basalt) role hex", () => {
    expect(dark).toContain("--bg-0: #25282a");
    expect(dark).toContain("--bg-1: #2b3330");
    expect(dark).toContain("--bg-2: #313b37");
    expect(dark).toContain("--bg-3: #39443f");
    expect(dark).toContain("--ink: #eef1f2");
    expect(dark).toContain("--ink-dim: #b3bfa9");
    expect(dark).toContain("--ink-faint: #a3b19b");
    expect(dark).toContain("--brass: #dfa84a");
    expect(dark).toContain("--brass-bright: #efc272");
    expect(dark).toContain("--brass-deep: #8a6320");
    expect(dark).toContain("--clay: #b87355");
    expect(dark).toContain("--clay-ink: #e0a488");
    expect(dark).toContain("--moss: #2d4a3e");
    expect(dark).toContain("--slate: #8b9fc2");
    expect(dark).toContain("--timber: #b9ab93");
    expect(dark).toMatch(/--line:\s*rgba\(\s*163,\s*177,\s*155,\s*0?\.16\s*\)/);
    expect(dark).toMatch(
      /--line-strong:\s*rgba\(\s*163,\s*177,\s*155,\s*0?\.3(?:0)?\s*\)/,
    );
  });

  it("declares every light (mist) role hex — derived, not copied from dark", () => {
    expect(light).toContain("--bg-0: #eef1f2");
    expect(light).toContain("--bg-1: #f5f7f8");
    expect(light).toContain("--bg-2: #fbfcfc");
    expect(light).toContain("--bg-3: #ffffff");
    expect(light).toContain("--ink: #25282a");
    expect(light).toContain("--ink-dim: #4f5f48");
    expect(light).toContain("--ink-faint: #5f6b5a");
    expect(light).toContain("--brass: #8a6320");
    expect(light).toContain("--brass-bright: #a97b25");
    expect(light).toContain("--brass-deep: #6f4e15");
    expect(light).toContain("--clay: #8f5138");
    expect(light).toContain("--clay-ink: #8f5138");
    expect(light).toContain("--moss: #2d4a3e");
    expect(light).toContain("--slate: #46608a");
    expect(light).toContain("--timber: #6a5c48");
    expect(light).toContain("--line: #c9d2d0");
    expect(light).toContain("--line-strong: #a9b6b3");
    expect(light).not.toContain("--brass: #dfa84a");
    expect(light).not.toContain("--ink-faint: #a3b19b");
    expect(light).not.toContain("--clay: #b87355");
  });

  it("retires --violet and re-points good/warn/bad", () => {
    expect(globals).not.toMatch(/--violet\s*:/);
    expect(dark).toContain("--clay-ink:");
    expect(dark).toContain("--timber:");
    expect(dark).toContain("--good: var(--moss)");
    expect(dark).toContain("--warn: var(--brass)");
    expect(dark).toContain("--bad: var(--clay-ink)");
  });

  it("keeps the two usage rules in the token block as comments", () => {
    expect(dark).toMatch(/one highlight per screen/i);
    expect(dark).toMatch(/dark moss is a surface/i);
    expect(dark).toMatch(/light moss is ink/i);
  });
});

describe("type stack and scale", () => {
  it("maps semantic font tokens to Outfit / Archivo / Geist Mono", () => {
    expect(globals).toContain("--font-display: var(--font-outfit)");
    expect(globals).toContain("--font-sans: var(--font-archivo)");
    expect(globals).toMatch(/--font-mono:\s*var\(--font-geist-mono\)/);
    expect(globals).toContain("Helvetica Neue");
    expect(globals).toContain("ui-monospace");
  });

  it("declares the measured type-scale tokens", () => {
    expect(globals).toContain("--text-display: clamp(2.4rem, 5.6vw, 4.1rem)");
    expect(globals).toContain("--text-h1: clamp(1.9rem, 3.4vw, 2.7rem)");
    expect(globals).toContain("--text-h2: clamp(1.4rem, 2.4vw, 1.95rem)");
    expect(globals).toContain("--text-h3: 1.06rem");
    expect(globals).toContain("--text-body: 1rem");
    expect(globals).toContain("--text-small: 0.875rem");
    expect(globals).toContain("--text-label: 0.66rem");
    expect(globals).toContain("--text-data: 0.82rem");
    expect(globals).toContain("--text-kpi: 1.85rem");
    expect(globals).toContain("--measure: 68ch");
    expect(globals).toContain("--measure-lede: 60ch");
    expect(globals).toContain("--text-display-weight: 700");
    expect(globals).toContain("--text-h1-weight: 700");
    expect(globals).toContain("--text-h2-weight: 600");
    expect(globals).toContain("--text-h3-weight: 600");
    expect(globals).toContain("--text-body-weight: 400");
    expect(globals).toContain("--text-display-tracking: -0.015em");
    expect(globals).toContain("--text-h1-tracking: -0.015em");
    expect(globals).toContain("--text-h2-tracking: -0.01em");
    expect(globals).toContain("--text-h3-tracking: -0.005em");
    expect(globals).toContain("--text-kpi-tracking: -0.02em");
    expect(globals).toContain("--text-label-tracking: 0.16em");
    expect(globals).toContain("--text-display-leading: 1.02");
    expect(globals).toContain("--text-h1-leading: 1.06");
    expect(globals).toContain("--text-h2-leading: 1.12");
    expect(globals).toContain("--text-h3-leading: 1.25");
    expect(globals).toMatch(/--text-body-leading:\s*1\.6/);
    expect(globals).toContain("--text-small-leading: 1.55");
    expect(globals).toMatch(/uppercase/);
    expect(globals).toContain("tabular-nums");
  });

  it("loads Outfit, Archivo, and Geist Mono through next/font with distinct variable names", () => {
    expect(layout).toContain('from "next/font/google"');
    expect(layout).toContain("Outfit");
    expect(layout).toContain("Archivo");
    expect(layout).toContain("Geist_Mono");
    expect(layout).not.toContain("Fraunces");
    expect(layout).not.toMatch(/\bGeist\b/);
    expect(layout).toContain('variable: "--font-outfit"');
    expect(layout).toContain('variable: "--font-archivo"');
    expect(layout).toContain('variable: "--font-geist-mono"');
    expect(layout).toContain("THEME_INIT_SCRIPT");
  });
});

describe("geometry, overlays, motion", () => {
  it("sharpens radii and recasts the panel shadow", () => {
    expect(globals).toContain("--r-sm: 4px");
    expect(globals).toContain("--r-md: 6px");
    expect(globals).toContain("--r-lg: 10px");
    expect(globals).toContain("--shadow-panel:");
  });

  it("keeps grain, adds a 46s clearing-sky drift, and gates both under reduced motion", () => {
    expect(globals).toContain("body::before");
    expect(globals).toContain("body::after");
    expect(globals).toContain("fractalNoise");
    expect(globals).toMatch(/body::before[\s\S]*?opacity:\s*0\.05/);
    expect(globals).toMatch(
      /\[data-theme="light"\] body::before[\s\S]*?opacity:\s*0\.035/,
    );
    expect(globals).toContain("46s");
    expect(globals).toMatch(/alternate/);
    expect(globals).toMatch(/@keyframes sky-drift/);
    expect(globals).toContain("calc(var(--i, 0) * 70ms)");
    expect(globals).toContain("@media (prefers-reduced-motion: reduce)");
    const mediaStart = globals.indexOf(
      "@media (prefers-reduced-motion: reduce)",
    );
    const media = globals.slice(mediaStart);
    expect(media).toMatch(/body::after\s*\{[^}]*animation:\s*none/);
    expect(media).toContain("transition-duration: 0.01ms !important");
  });
});

describe("contrast claims (text roles)", () => {
  it("dark text roles clear 4.5:1 against --bg-2 (slate documented below that)", () => {
    const bg2 = tokenHex(dark, "--bg-2");
    const textRoles = [
      "--ink",
      "--ink-dim",
      "--ink-faint",
      "--brass",
      "--brass-bright",
      "--clay-ink",
      "--timber",
    ];
    for (const name of textRoles) {
      const ratio = contrast(tokenHex(dark, name), bg2);
      expect(
        ratio,
        `${name} on --bg-2 = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    // Spec table lists slate vs bg-2 at 4.33:1 — claimed as text, not vs the
    // lightest surface. Lock the measured number so a silent lift still fails.
    expect(contrast(tokenHex(dark, "--slate"), bg2)).toBeCloseTo(4.33, 2);
  });

  it("light text roles clear 4.5:1 against #ffffff (brass-bright is fill-only)", () => {
    const white = "#ffffff";
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
      const ratio = contrast(tokenHex(light, name), white);
      expect(
        ratio,
        `${name} on #ffffff = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(tokenHex(light, "--brass-bright"), white)).toBeCloseTo(
      3.79,
      2,
    );
  });
});

describe("chart literals and aliases", () => {
  it("keeps --background/--foreground aliases", () => {
    expect(globals).toContain("--background: var(--bg-0)");
    expect(globals).toContain("--foreground: var(--ink)");
  });

  it("moves the two chart files onto the dark PNW data palette", () => {
    const expected = ["#a3b19b", "#e0a488", "#8b9fc2", "#b9ab93", "#dfa84a"];
    const retired = ["#8fae83", "#a88fc0", "#cd7258", "#dfa33c"];
    for (const src of [crmCharts, rolodexCharts]) {
      for (const hex of expected) {
        expect(src).toContain(hex);
      }
      for (const hex of retired) {
        expect(src).not.toContain(hex);
      }
    }
  });
});
