import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const subnav = read("components/crm/crm-subnav.tsx");
const subnavCss = read("components/crm/crm-subnav.module.css");
const charts = read("components/crm/dashboard-charts.tsx");
const dashboardCss = read("components/crm/dashboard.module.css");
const orgCss = read("components/crm/org.module.css");
const pipelineCss = read("components/crm/pipeline-board.module.css");
const page = read("app/(authenticated)/crm/page.tsx");
const orgsPage = read("app/(authenticated)/crm/organizations/page.tsx");

describe("CRM subnav", () => {
  it("uses inline SVG glyphs and the shared subtab classes", () => {
    expect(subnav).toContain("<svg");
    expect(subnav).toContain("atrium-subtab");
    expect(subnav).toContain("aria-label=\"CRM\"");
  });

  it("drops the unicode glyph literals", () => {
    for (const char of ["\u25A6", "\u2B21", "\u25CF", "$", "\u2261"]) {
      expect(subnav).not.toContain(`glyph: "${char}"`);
    }
  });
});

describe("CRM dashboard", () => {
  it("keeps recharts animation off and the lib aggregation split", () => {
    expect(charts).toContain("isAnimationActive={false}");
    expect(charts).not.toContain("buildDashboard");
    expect(charts).not.toContain("monthlyRevenue");
  });

  it("themes the charts to the warm palette (brass / moss / slate / clay)", () => {
    expect(charts).toContain("#dfa33c"); // brass
    expect(charts).toContain("#8fae83"); // moss
    expect(charts).toContain("#8b9fc2"); // slate
    expect(charts).toContain("#cd7258"); // clay
  });

  it("uses the shared pagetitle and staggers the KPI tiles", () => {
    expect(page).toContain("atrium-pagetitle");
    expect(page).toContain("index={1}");
    expect(page).toContain("index={5}");
    expect(dashboardCss).toContain("--tile-c");
    expect(dashboardCss).toContain("var(--font-display)");
    expect(dashboardCss).toContain("var(--bg-1)");
  });
});

describe("CRM tables / dialogs / board use Workroom tokens", () => {
  it("org.module.css uses the token palette, not flat hex surfaces", () => {
    expect(orgCss).toContain("var(--bg-1)");
    expect(orgCss).toContain("var(--ink)");
    expect(orgCss).toContain("var(--brass)");
    expect(orgCss).toContain("var(--r-md)");
    expect(orgCss).toContain("backdrop-filter");
    expect(orgCss).toContain('button[type="submit"]');
  });

  it("pipeline-board module maps stages to the warm palette", () => {
    expect(pipelineCss).toContain("--stage-c");
    expect(pipelineCss).toContain("var(--moss)");
    expect(pipelineCss).toContain("var(--clay)");
    expect(pipelineCss).toContain("var(--slate)");
  });

  it("section pages carry the shared pagetitle", () => {
    expect(orgsPage).toContain("atrium-pagetitle");
  });
});