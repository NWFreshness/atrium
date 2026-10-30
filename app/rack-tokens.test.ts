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

// Coral: paper is the :root default, the felt board is the dark override.
const paper = block(globals, ":root {", '[data-theme="dark"]');
const board = block(globals, '[data-theme="dark"] {', "/* ---------- Base");

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

describe("coral role table (verbatim)", () => {
  it("declares every paper (light default) role hex", () => {
    expect(paper).toContain("--bg-0: #f4efec");
    expect(paper).toContain("--bg-1: #faf5f3");
    expect(paper).toContain("--bg-2: #fdfbf8");
    expect(paper).toContain("--bg-3: #fefdfb");
    expect(paper).toContain("--line: #d9d3cf");
    expect(paper).toContain("--line-strong: #c0b9b4");
    expect(paper).toContain("--grid: #f0ebe7");
    expect(paper).toContain("--ink: #1d1614");
    expect(paper).toContain("--ink-dim: #3c3330");
    expect(paper).toContain("--ink-faint: #615955");
    expect(paper).toContain("--brass: #b63328");
    expect(paper).toContain("--brass-bright: #ef8b7b");
    expect(paper).toContain("--brass-deep: #94231a");
    expect(paper).toContain("--amber: #1f1917");
    expect(paper).toContain("--on-amber: #f6f3ef");
    expect(paper).toContain("--clay: #c86556");
    expect(paper).toContain("--clay-ink: #8e3c00");
    expect(paper).toContain("--moss: #236436");
    expect(paper).toContain("--slate: #5c493a");
    expect(paper).toContain("--timber: #795d3c");
    expect(paper).toContain("--ochre: #815c0a");
    expect(paper).toContain("--led-off: #c4bcb7");
  });

  it("declares every felt-board (dark) role hex — derived, not inverted", () => {
    expect(board).toContain("--bg-0: #130e0c");
    expect(board).toContain("--bg-1: #1a1512");
    expect(board).toContain("--bg-2: #221b18");
    expect(board).toContain("--bg-3: #29221f");
    expect(board).toContain("--line: #362f2b");
    expect(board).toContain("--line-strong: #4e4642");
    expect(board).toContain("--grid: #17110f");
    expect(board).toContain("--ink: #efeae5");
    expect(board).toContain("--ink-dim: #ccc6c1");
    expect(board).toContain("--ink-faint: #aba39e");
    expect(board).toContain("--brass: #ec8d7a");
    expect(board).toContain("--brass-bright: #f7a695");
    expect(board).toContain("--brass-deep: #bb584a");
    expect(board).toContain("--amber: #efeae5");
    expect(board).toContain("--on-amber: #1b1412");
    expect(board).toContain("--clay: #c86556");
    expect(board).toContain("--clay-ink: #e79e6b");
    expect(board).toContain("--moss: #82c38f");
    expect(board).toContain("--slate: #aeaaa7");
    expect(board).toContain("--timber: #cbb394");
    expect(board).toContain("--ochre: #dbb970");
    expect(board).toContain("--led-off: #4e4642");
    expect(board).not.toContain("--brass: #b63328");
    expect(board).not.toContain("--ink-faint: #615955");
    expect(board).not.toContain("--moss: #236436");
  });

  it("keeps --violet retired and good/warn/bad/led on the signal roles", () => {
    expect(globals).not.toMatch(/--violet\s*:/);
    expect(paper).toContain("--clay-ink:");
    expect(paper).toContain("--timber:");
    expect(paper).toContain("--good: var(--moss)");
    expect(paper).toContain("--warn: var(--ochre)");
    expect(paper).toContain("--bad: var(--clay-ink)");
    expect(paper).toContain("--led: var(--moss)");
  });

  it("keeps the usage rules in the token block as comments", () => {
    expect(paper).toMatch(/ink is the highlight/i);
    expect(paper).toMatch(/status is a word/i);
    expect(paper).toMatch(/figures that compare are --font-mono/i);
  });
});

describe("type stack and scale", () => {
  it("maps semantic font tokens to General Sans (words) and Geist Mono (figures)", () => {
    expect(globals).toMatch(/--font-display:\s*var\(--font-general-sans\)/);
    expect(globals).toContain("--font-sans: var(--font-general-sans)");
    expect(globals).toMatch(/--font-mono:\s*var\(--font-geist-mono\)/);
    expect(globals).toContain("system-ui");
    expect(globals).toContain("ui-monospace");
  });

  it("declares a fixed 1.2 type scale from a 16px body, no fluid heads", () => {
    expect(globals).toContain("--text-display: 2.5rem");
    expect(globals).toContain("--text-h1: 1.875rem");
    expect(globals).toContain("--text-h2: 1.375rem");
    expect(globals).toContain("--text-h3: 1.125rem");
    expect(globals).toContain("--text-body: 1rem");
    expect(globals).toContain("--text-small: 0.875rem");
    expect(globals).toContain("--text-label: 0.8125rem");
    expect(globals).toContain("--text-data: 0.875rem");
    expect(globals).toContain("--text-kpi: 1.75rem");
    expect(globals).toContain("--measure: 68ch");
    expect(globals).toContain("--measure-lede: 60ch");
    expect(globals).toContain("--text-display-weight: 600");
    expect(globals).toContain("--text-h1-weight: 600");
    expect(globals).toContain("--text-h2-weight: 600");
    expect(globals).toContain("--text-h3-weight: 600");
    expect(globals).toContain("--text-body-weight: 400");
    expect(globals).toContain("--text-kpi-weight: 400");
    expect(globals).toContain("--text-display-tracking: -0.03em");
    expect(globals).toContain("--text-label-tracking: 0");
    expect(globals).toContain("--text-display-leading: 1.05");
    expect(globals).toContain("--text-h1-leading: 1.1");
    expect(globals).toContain("--text-h2-leading: 1.2");
    expect(globals).toContain("--text-h3-leading: 1.3");
    expect(globals).toMatch(/--text-body-leading:\s*1\.55/);
    expect(globals).toContain("--text-small-leading: 1.5");
    expect(globals).not.toMatch(/--text-[a-z0-9-]+:\s*clamp\(/);
    expect(globals).not.toMatch(/uppercase/);
  });

  it("self-hosts General Sans and loads Geist Mono through next/font", () => {
    expect(layout).toContain('from "next/font/local"');
    expect(layout).toContain('from "next/font/google"');
    expect(layout).toContain("Geist_Mono");
    expect(layout).toContain("./fonts/GeneralSans-Regular.woff2");
    expect(layout).toContain("./fonts/GeneralSans-Medium.woff2");
    expect(layout).toContain("./fonts/GeneralSans-Semibold.woff2");
    expect(layout).not.toContain("JetBrains_Mono");
    expect(layout).not.toContain("IBM_Plex_Sans");
    expect(layout).toContain('variable: "--font-general-sans"');
    expect(layout).toContain('variable: "--font-geist-mono"');
    expect(layout).toContain("THEME_INIT_SCRIPT");
  });
});

describe("geometry, surfaces, motion", () => {
  it("rounds stationery corners and casts every shadow to the right", () => {
    expect(globals).toContain("--r-sm: 4px");
    expect(globals).toContain("--r-md: 6px");
    expect(globals).toContain("--r-lg: 8px");
    expect(paper).toMatch(/--cast-stock:\s*6px 5px/);
    expect(paper).toMatch(/--cast-stock-lift:\s*12px 10px/);
    // Dark discipline: no drop shadows on the board, elevation by hairline.
    expect(board).toMatch(/--cast-stock:\s*0 0 0 0 transparent/);
    expect(board).toMatch(/--shadow-panel:\s*inset/);
  });

  it("keeps the page plain: no overlay, no grid paper, no drift", () => {
    expect(globals).not.toContain("body::before");
    expect(globals).not.toContain("body::after");
    const from = globals.indexOf("\nbody {\n  margin: 0;");
    expect(from, "missing the body rule").toBeGreaterThan(-1);
    const body = globals.slice(from, globals.indexOf("}", from));
    expect(body).toContain("var(--bg-0)");
    expect(body).not.toContain("background-size");
    expect(body).not.toContain("animation");
    expect(globals).not.toContain("sky-drift");
  });

  it("gates the remaining motion under reduced motion", () => {
    expect(globals).toContain("calc(var(--i, 0) * 40ms)");
    const mediaStart = globals.indexOf(
      "@media (prefers-reduced-motion: reduce)",
    );
    expect(mediaStart).toBeGreaterThan(-1);
    const media = globals.slice(mediaStart);
    expect(media).toMatch(/\.reveal\s*\{[^}]*animation:\s*none/);
    expect(media).toContain("transition-duration: 0.01ms !important");
  });

  it("tints the well token per theme, so it follows the theme", () => {
    expect(paper).toMatch(/--grid:\s*#[0-9a-f]{6}/);
    expect(board).toMatch(/--grid:\s*#[0-9a-f]{6}/);
    expect(tokenHex(paper, "--grid")).not.toBe(tokenHex(board, "--grid"));
  });
});

describe("contrast claims (text roles)", () => {
  it("board text roles clear 4.5:1 against --bg-2", () => {
    const bg2 = tokenHex(board, "--bg-2");
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
      "--ochre",
    ];
    for (const name of textRoles) {
      const ratio = contrast(tokenHex(board, name), bg2);
      expect(
        ratio,
        `${name} on --bg-2 = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("paper text roles clear 4.5:1 against the darkest paper (brass-bright and clay are fill-only)", () => {
    const page = tokenHex(paper, "--bg-0");
    const textRoles = [
      "--ink",
      "--ink-dim",
      "--ink-faint",
      "--brass",
      "--brass-deep",
      "--clay-ink",
      "--moss",
      "--slate",
      "--timber",
      "--ochre",
    ];
    for (const name of textRoles) {
      const ratio = contrast(tokenHex(paper, name), page);
      expect(
        ratio,
        `${name} on --bg-0 = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    // Light coral cannot be ink on paper: it is a fill, and --brass is the ink.
    expect(contrast(tokenHex(paper, "--brass-bright"), page)).toBeLessThan(3);
  });

  it("board-ink fills always carry readable --on-amber text", () => {
    for (const block of [paper, board]) {
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

describe("light-first default with a persisted toggle (Coral)", () => {
  it("mounts the pre-paint init script in the root layout", () => {
    expect(layout).toContain("THEME_INIT_SCRIPT");
  });

  it("falls back to light for first visits and malformed stored values", () => {
    expect(theme).toContain('t="light"');
    expect(theme).toMatch(/if\(t!=="light"&&t!=="dark"\)/);
  });

  it("persists the toggle client-side without following the OS preference", () => {
    expect(theme).toContain('THEME_STORAGE_KEY = "atrium.theme"');
    expect(theme).toContain("localStorage.getItem");
    expect(theme).toContain("setItem(THEME_STORAGE_KEY, next)");
    expect(theme).not.toContain("matchMedia(");
  });
});
