import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const chrome = read("app/workroom.css");
const nav = read("components/atrium-nav.tsx");
const icons = read("components/atrium-icons.tsx");
const launcher = read("app/(authenticated)/page.tsx");
const loginForm = read("app/login/login-form.tsx");

describe("Workroom shared chrome classes (app/workroom.css)", () => {
  it("defines the shared presentational class set", () => {
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
      expect(chrome, `missing ${cls}`).toContain(cls);
    }
  });

  it("uses the Workroom tokens rather than re-declaring colors", () => {
    expect(chrome).toContain("var(--bg-1)");
    expect(chrome).toContain("var(--brass)");
    expect(chrome).toContain("var(--ink-dim)");
    expect(chrome).toContain("var(--font-display)");
  });
});

describe("top nav", () => {
  it("keeps the five nav link labels the Playwright smokes resolve", () => {
    for (const label of ["Home", "CRM", "Space", "Rolodex", "Groove"]) {
      expect(nav).toContain(`label: "${label}"`);
    }
  });

  it("uses inline SVG glyphs instead of emoji/unicode glyphs", () => {
    expect(icons).toContain("<svg");
    expect(icons).toContain('stroke: "currentColor"');
    expect(icons).toContain('strokeLinecap: "round"');
    expect(nav).toContain("<app.Icon");
    expect(nav).not.toContain("glyph:");
    for (const char of ["\u2302", "\u25C7", "\u25A3", "\u25C9", "\u266A"]) {
      expect(nav, `stray glyph ${char}`).not.toContain(char);
    }
  });
});

describe("launcher", () => {
  it("renders four described app-card links into the Workroom layout", () => {
    for (const cls of ["atrium-launcher", "atrium-graph", "atrium-appcard", "atrium-appcard-open"]) {
      expect(launcher).toContain(cls);
    }
    for (const label of ["CRM", "Space", "Rolodex", "Groove"]) {
      expect(launcher).toContain(`label: "${label}"`);
    }
  });

  it("keeps the launcher heading the login-smoke asserts", () => {
    expect(launcher).toContain("<h1>Atrium</h1>");
  });
});

describe("login", () => {
  it("keeps the Email/Password labels and the Sign in button the e2e relies on", () => {
    expect(loginForm).toContain("Email");
    expect(loginForm).toContain("Password");
    expect(loginForm).toContain("Sign in");
    expect(loginForm).toContain('autoComplete="username"');
    expect(loginForm).toContain('autoComplete="current-password"');
  });

  it("uses the shared button/field classes", () => {
    expect(loginForm).toContain("atrium-field");
    expect(loginForm).toContain("atrium-btn");
    expect(loginForm).toContain("atrium-btn-primary");
  });
});