import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const navCss = read("components/atrium-nav.module.css");
const navTsx = read("components/atrium-nav.tsx");
const chrome = read("app/workroom.css");
const launcher = read("app/(authenticated)/page.tsx");
const stage = read("app/auth-stage.module.css");
const loginPage = read("app/login/page.tsx");
const signupPage = read("app/signup/page.tsx");

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

describe("rack nav chrome", () => {
  it("keeps the accessible nav contract Playwright walks", () => {
    expect(navTsx).toContain('aria-label="Atrium"');
    expect(navTsx).toContain('aria-label="Toggle theme"');
    for (const label of ["Home", "CRM", "Space", "Rolodex", "Groove"]) {
      expect(navTsx).toContain(`label: "${label}"`);
    }
  });

  it("sets the wordmark as a wide-tracked uppercase mono plate", () => {
    expect(navCss).toContain("font-family: var(--font-display)");
    expect(navCss).toContain("font-weight: 700");
    expect(navCss).toContain("letter-spacing: 0.2em");
    expect(navCss).toContain("text-transform: uppercase");
  });

  it("reserves the amber block for the active nav item, not hover", () => {
    expect(navCss).toContain(".atrium-nav-link-current");
    expect(navCss).toMatch(
      /\.atrium-nav-link-current[^{]*\{[^}]*background:\s*var\(--amber\)/,
    );
    expect(navCss).toMatch(
      /\.atrium-nav-link-current[^{]*\{[^}]*color:\s*var\(--on-amber\)/,
    );
    expect(navCss).not.toMatch(
      /\.atrium-nav-link:hover\s*\{[^}]*var\(--amber\)/,
    );
    expect(navCss).toMatch(
      /\.atrium-nav-link:hover\s*\{[^}]*color:\s*var\(--ink\)/,
    );
  });

  it("makes the brand mark a 7px amber power LED", () => {
    expect(navCss).toContain("width: 7px");
    expect(navCss).toContain("height: 7px");
    expect(navCss).toMatch(
      /\.atrium-nav-brand-mark\s*\{[^}]*border-radius:\s*50%[^}]*background:\s*var\(--amber\)/,
    );
    expect(navTsx).toContain('aria-hidden="true"');
  });
});

describe("shared atrium- layer", () => {
  it("keeps the class set 5.7 resolves by path", () => {
    for (const cls of [
      ".atrium-btn",
      ".atrium-btn-primary",
      ".atrium-field",
      ".atrium-panel",
      ".atrium-label",
      ".atrium-chip",
      ".atrium-avatar",
      ".atrium-kpi",
      ".atrium-subnav",
      ".atrium-subtab",
      ".atrium-pagetitle",
      ".atrium-appcard",
    ]) {
      expect(chrome).toContain(cls);
    }
  });

  it("paints the primary button as amber fill with its paired ink", () => {
    expect(chrome).toContain("background: var(--amber)");
    expect(chrome).toContain("color: var(--on-amber)");
    expect(chrome).not.toMatch(
      /\.atrium-btn-primary[^{]*\{[^}]*#[0-9a-fA-F]{6}/,
    );
    expect(chrome).not.toContain("#221a0c");
    expect(chrome).not.toContain("#fdf8ec");
  });

  it("gives fields a 2px golden :focus-visible ring", () => {
    expect(chrome).toContain(":focus-visible");
    expect(chrome).toMatch(/\.atrium-field input:focus-visible\s*\{[^}]*2px/);
    expect(chrome).toMatch(
      /\.atrium-field input:focus-visible\s*\{[^}]*var\(--brass\)/,
    );
  });

  it("uses type-scale tokens on the launcher hero and KPI figures", () => {
    expect(chrome).toContain("font-size: var(--text-display)");
    expect(chrome).toContain("font-size: var(--text-kpi)");
    expect(chrome).toContain("font-variant-numeric: tabular-nums");
    expect(chrome).toContain("font-family: var(--font-mono)");
  });
});

describe("launcher rack units", () => {
  it("renders four numbered units with status LEDs and live readouts", () => {
    expect(launcher).toContain('label: "CRM"');
    expect(launcher).toContain('label: "Space"');
    expect(launcher).toContain('label: "Rolodex"');
    expect(launcher).toContain('label: "Groove"');
    for (const unit of ["U1 · CR", "U2 · SP", "U3 · RX", "U4 · GR"]) {
      expect(launcher).toContain(`unit: "${unit}"`);
    }
    expect(launcher).toContain("launcherReadouts(");
    expect(launcher).toContain("atrium-led");
    // An LED never speaks by colour alone: each status carries a word.
    expect(launcher).toContain("aria-label={LED_WORD[unit.status]}");
    expect(launcher).toContain("atrium-appcard-readouts");
    expect(launcher).toContain("reveal");
    expect(launcher).toContain("<h1>Atrium</h1>");
  });
});

describe("auth stage", () => {
  it("keeps force-dynamic on both auth pages", () => {
    expect(loginPage).toContain('export const dynamic = "force-dynamic"');
    expect(signupPage).toContain('export const dynamic = "force-dynamic"');
  });

  it("paints alerts in clay-ink", () => {
    expect(stage).toContain("var(--clay-ink)");
  });
});

describe("no espresso-era hex in the 10.2 files", () => {
  const files = {
    "components/atrium-nav.module.css": navCss,
    "app/workroom.css": chrome,
    "app/(authenticated)/page.tsx": launcher,
    "app/auth-stage.module.css": stage,
  };
  it.each(Object.entries(files))("%s has no espresso hex", (_name, src) => {
    for (const hex of ESPRESSO) {
      expect(src, hex).not.toContain(hex);
    }
  });
});
