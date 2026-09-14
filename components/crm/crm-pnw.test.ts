/**
 * Phase 10.3 — the CRM pass gate.
 *
 * `crm-pass.test.ts` (5.3) proved the shapes were there. This extends that
 * contract onto the PNW tokens: one semantic accent per tile, one golden element
 * per screen (the active subnav), the PNW data palette in the charts, opacity
 * (never `display`) for the row-action reveal, and no espresso/brass-era value
 * left in the CRM modules. It stays a source gate on purpose — 10.7 turns the
 * colour claims into a computed-contrast gate and keeps this as the cheap one.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const dashboardCss = read("components/crm/dashboard.module.css");
const orgCss = read("components/crm/org.module.css");
const pipelineCss = read("components/crm/pipeline-board.module.css");
const subnavCss = read("components/crm/crm-subnav.module.css");
const subnav = read("components/crm/crm-subnav.tsx");
const charts = read("components/crm/dashboard-charts.tsx");
const statTile = read("components/crm/stat-tile.tsx");
const dashboardPage = read("app/(authenticated)/crm/page.tsx");

const PAGES = [
  "app/(authenticated)/crm/page.tsx",
  "app/(authenticated)/crm/organizations/page.tsx",
  "app/(authenticated)/crm/contacts/page.tsx",
  "app/(authenticated)/crm/deals/page.tsx",
  "app/(authenticated)/crm/pipeline/page.tsx",
] as const;
const pages = PAGES.map((path) => ({ path, src: read(path) }) as const);

const TABLE_COMPONENTS = [
  "components/crm/org-table.tsx",
  "components/crm/contact-table.tsx",
  "components/crm/deal-table.tsx",
] as const;

/** Espresso / brass-era values: retired by 10.1, on 10.7's grep list. */
const ESPRESSO = [
  "#13100c",
  "#1b1712",
  "#231e16",
  "#2b251b",
  "#f0e9da",
  "#ece5d6",
  "#262015",
  "#a86f14",
  "#dfa33c",
  "#221a0c",
  "#fdf8ec",
];

/** The four retired series literals (the PNW palette replaced them in 10.1). */
const RETIRED_SERIES = ["#8fae83", "#a88fc0", "#cd7258"];
/** The PNW data palette, the only hexes allowed inside the charts. */
const PNW_SERIES = ["#a3b19b", "#e0a488", "#8b9fc2", "#b9ab93", "#dfa84a"];

const TILE_TONES = [
  "tileCount",
  "tileOpen",
  "tileForecast",
  "tileWon",
  "tileLate",
] as const;

const STAGE_TONES = [
  "stageNew",
  "stageQualified",
  "stageProposal",
  "stageNegotiation",
  "stageWon",
  "stageLost",
] as const;

/** The declaration block of `selector`, for the rule that starts a block (so a
 * grouped selector like `.a,\n.b { … }` is skipped rather than mistaken for it). */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{`).exec(css);
  expect(match, `${selector} is not declared`).toBeTruthy();
  const open = match!.index + match![0].length - 1;
  const close = css.indexOf("}", open);
  expect(close, `${selector} block is unterminated`).toBeGreaterThan(open);
  return css.slice(open + 1, close);
}

describe("PNW tokens in the CRM modules", () => {
  it("retires --violet from both modules that still pointed at it", () => {
    expect(dashboardCss).not.toContain("--violet");
    expect(pipelineCss).not.toContain("--violet");
  });

  it("paints the dashboard from the PNW token set", () => {
    for (const token of [
      "var(--bg-1)",
      "var(--line)",
      "var(--r-md)",
      "var(--shadow-panel)",
      "var(--ink)",
      "var(--ink-faint)",
      "var(--moss)",
      "var(--brass)",
      "var(--clay-ink)",
      "var(--slate)",
      "var(--font-display)",
      "var(--font-mono)",
      "var(--text-kpi)",
      "var(--text-label)",
    ]) {
      expect(dashboardCss, token).toContain(token);
    }
  });

  it("keeps the late tone on cedar-ink, not the deep clay fill", () => {
    expect(rule(dashboardCss, ".tileLate")).toContain("var(--clay-ink)");
    expect(rule(dashboardCss, ".feedTitleLate")).toContain("var(--clay-ink)");
  });
});

describe("KPI tiles", () => {
  it("sets figures in the display face at the KPI scale with tabular numerals", () => {
    const value = rule(dashboardCss, ".tileValue");
    expect(value).toContain("font-family: var(--font-display)");
    expect(value).toContain("font-size: var(--text-kpi)");
    expect(value).toContain("font-variant-numeric: tabular-nums");
  });

  it("sets labels in the mono face at the label scale, uppercase", () => {
    const label = rule(dashboardCss, ".tileLabel");
    expect(label).toContain("font-family: var(--font-mono)");
    expect(label).toContain("font-size: var(--text-label)");
    expect(label).toContain("uppercase");
  });

  it("gives every tile exactly one accent, drawn from the four semantic tones", () => {
    const tones: string[] = [];
    for (const name of TILE_TONES) {
      const block = rule(dashboardCss, `.${name}`);
      const vars = [...block.matchAll(/var\(--([a-z-]+)\)/g)].map((m) => m[1]);
      expect(vars, `.${name} must set one accent token`).toHaveLength(1);
      expect(["slate", "moss", "brass", "clay-ink"], `.${name}`).toContain(
        vars[0],
      );
      tones.push(vars[0]);
    }
    // One golden element per screen: the most important tile is the only brass.
    expect(tones.filter((tone) => tone === "brass")).toHaveLength(1);
    // open / in-pipeline reads moss; neutral reads slate.
    expect(tones).toContain("moss");
    expect(tones).toContain("slate");
  });

  it("passes the tone through the tile component and keeps the --i stagger", () => {
    expect(statTile).toContain('"--i"');
    expect(statTile).toContain("data-tone={tone}");
    for (const name of TILE_TONES) {
      expect(statTile, name).toContain(`styles.${name}`);
    }
  });
});

describe("PNW data palette in the charts", () => {
  it("paints the four series from the PNW values only", () => {
    for (const hex of PNW_SERIES) {
      expect(charts, hex).toContain(hex);
    }
    for (const hex of RETIRED_SERIES) {
      expect(charts, `${hex} is retired`).not.toContain(hex);
    }
  });

  it("labels every series, because the PNW hues are close in luminance", () => {
    const sections = [...charts.matchAll(/styles\.chart\b/g)].length;
    const legends = [...charts.matchAll(/<Legend/g)].length;
    expect(sections).toBeGreaterThanOrEqual(4);
    expect(legends).toBe(sections);
  });

  it("keeps recharts animation off and the aggregation in lib/", () => {
    expect(charts).toContain("isAnimationActive={false}");
    expect(charts).not.toContain("buildDashboard");
  });
});

describe("one golden element per screen", () => {
  it("marks the active CRM tab through the shared layer, once", () => {
    expect(subnav).toContain("atrium-subnav");
    expect(subnav.match(/atrium-subtab-active/g)).toHaveLength(1);
    expect(subnav).toMatch(/current\s*\?[^:]*atrium-subtab-active/);
    expect(subnav).toContain('aria-current={current ? "page" : undefined}');
  });

  it("does not re-declare a second golden state in the CRM subnav module", () => {
    expect(subnavCss).not.toContain("--violet");
    expect(subnavCss).not.toMatch(/active[^{}]*\{[^}]*var\(--brass\)/);
  });

  it("gives interactive CRM elements a 2px golden focus-visible ring", () => {
    expect(subnavCss).toMatch(
      /:focus-visible[^{}]*\{[^}]*outline:\s*2px solid var\(--brass\)/,
    );
    expect(orgCss).toMatch(
      /:focus-visible[^{}]*\{[^}]*outline:\s*2px solid var\(--brass\)/,
    );
    expect(pipelineCss).toContain(":focus-visible");
  });
});

describe("tables, dialogs, and the board", () => {
  it("keeps 44px rows and the mono label scale on headers", () => {
    expect(rule(orgCss, ".crm-table th")).toContain("var(--text-label)");
    expect(rule(orgCss, ".crm-table th")).toContain("var(--ink-faint)");
    expect(rule(orgCss, ".crm-table tbody td")).toContain("height: 44px");
    expect(rule(orgCss, ".crm-table tbody td")).toContain("tabular-nums");
  });

  it("reveals row actions with opacity, never display", () => {
    expect(orgCss).not.toMatch(/display:\s*none/);
    expect(rule(orgCss, ".crm-row-actions")).toContain("opacity: 0");
    expect(orgCss).toMatch(/:hover[^{]*\.crm-row-actions\s*\{[^}]*opacity: 1/);
    expect(orgCss).toMatch(
      /:focus-within[^{]*\.crm-row-actions\s*\{[^}]*opacity: 1/,
    );
  });

  it("keeps the accessible names Playwright clicks", () => {
    for (const path of TABLE_COMPONENTS) {
      const src = read(path);
      expect(src, path).toContain("aria-label={`Edit ${");
      expect(src, path).toContain("aria-label={`Delete ${");
    }
  });

  it("steps the six pipeline stages through one PNW family", () => {
    const tones = STAGE_TONES.map((name) => {
      const block = rule(pipelineCss, `.${name}`);
      expect(block, `.${name} must set --stage-c`).toContain("--stage-c:");
      return block;
    });
    for (const token of [
      "var(--slate)",
      "var(--moss)",
      "var(--timber)",
      "var(--brass)",
      "var(--clay-ink)",
    ]) {
      expect(tones.join("\n"), token).toContain(token);
    }
    // won = golden, lost = late cedar — the semantic ends of the family.
    expect(rule(pipelineCss, ".stageWon")).toContain("var(--brass)");
    expect(rule(pipelineCss, ".stageLost")).toContain("var(--clay-ink)");
    expect(rule(pipelineCss, ".stageNew")).toContain("var(--slate)");
  });
});

describe("five CRM routes", () => {
  it("wraps every heading in atrium-pagetitle with a mono sub-line", () => {
    for (const { path, src } of pages) {
      expect(src, path).toContain("atrium-pagetitle");
      expect(src, path).toContain('className="atrium-sub"');
    }
  });
});

describe("no espresso-era value left in components/crm", () => {
  const files = {
    "components/crm/dashboard.module.css": dashboardCss,
    "components/crm/org.module.css": orgCss,
    "components/crm/pipeline-board.module.css": pipelineCss,
    "components/crm/crm-subnav.module.css": subnavCss,
    "components/crm/dashboard-charts.tsx": charts,
    "components/crm/stat-tile.tsx": statTile,
  };

  it.each(Object.entries(files))("%s is clean", (_name, src) => {
    for (const hex of ESPRESSO) {
      expect(src, hex).not.toContain(hex);
    }
    expect(src).not.toMatch(/rgba\(\s*10,\s*8,\s*4/);
  });

  it("allows the PNW series literals only inside the chart component", () => {
    for (const [name, src] of Object.entries(files)) {
      if (name === "components/crm/dashboard-charts.tsx") continue;
      for (const hex of PNW_SERIES) {
        expect(src, `${name} must use tokens, not ${hex}`).not.toContain(hex);
      }
    }
  });
});

/*
  10.3 review fix — a legend label that repeats a KPI tile's text is not a
  style choice, it is a test failure waiting to happen: e2e/crm.spec.ts:51 matches
  "Pipeline value" with a strict getByText, and this pass added <Legend /> to the
  funnel chart. Two elements carrying that string make the locator throw.
  Any series name that equals a tile label on the same screen is the same bug.
*/
describe("chart series names never collide with a KPI tile label", () => {
  it("keeps every series name distinct from every tile label", () => {
    const seriesNames = [...charts.matchAll(/name="([^"]+)"/g)].map(
      (m) => m[1],
    );
    const tileLabels = [...dashboardPage.matchAll(/label="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(seriesNames.length).toBeGreaterThan(0);
    expect(tileLabels.length).toBeGreaterThan(0);
    for (const name of seriesNames) {
      expect(
        tileLabels,
        `chart series "${name}" duplicates a KPI tile label — a strict getByText would resolve to two elements`,
      ).not.toContain(name);
    }
  });
});
