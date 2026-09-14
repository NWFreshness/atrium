/**
 * Phase 10.4 — the Space PNW pass, as a source gate.
 *
 * `space-pass.test.ts` (5.4) keeps its SVG-glyph rule and the add-block
 * affordance; this file extends it: the PNW palette and type scale on every
 * Space surface, the golden-once rule for the sidebar's current-page marker,
 * and the 5.4 opacity pitfall the row actions must never regress to.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const shellCss = read("components/space/space-shell.module.css");
const editorCss = read("components/space/editor.module.css");
const dbCss = read("components/space/database-table.module.css");
const viewsCss = read("components/space/database-views.module.css");
const boardCss = read("components/space/board-view.module.css");
const quickFindCss = read("components/space/quick-find.module.css");
const editorTsx = read("components/space/editor.tsx");
const sidebarTsx = read("components/space/sidebar-tree.tsx");
const boardTsx = read("components/space/board-view.tsx");
const iconsTsx = read("components/space/space-icons.tsx");
const landingPage = read("app/(authenticated)/space/page.tsx");
const pageRoute = read("app/(authenticated)/space/[id]/page.tsx");

const MODULES: Record<string, string> = {
  "space-shell.module.css": shellCss,
  "editor.module.css": editorCss,
  "database-table.module.css": dbCss,
  "database-views.module.css": viewsCss,
  "board-view.module.css": boardCss,
  "quick-find.module.css": quickFindCss,
};

/** 5.4's espressso palette — 10.1 retired every one of these hexes. */
const RETIRED_HEX = [
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

const EMOJI = /\p{Extended_Pictographic}/u;

type Rule = { selector: string; body: string };

/** Strip CSS comments so prose about a pitfall can explain it freely. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseRules(css: string): Rule[] {
  const rules: Rule[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(stripComments(css))) !== null) {
    rules.push({ selector: match[1]!.trim(), body: match[2]! });
  }
  return rules;
}

/** Rules whose comma-separated selector list contains this exact selector. */
function matching(css: string, selector: string): Rule[] {
  return parseRules(css).filter((rule) =>
    rule.selector
      .split(",")
      .map((part) => part.trim())
      .includes(selector),
  );
}

function rule(css: string, selector: string): Rule {
  const found = matching(css, selector);
  expect(found.length, `missing rule ${selector}`).toBeGreaterThan(0);
  // A class can be styled by several rules (its own plus a shared group), so
  // assert against all of them together.
  return { selector, body: found.map((r) => r.body).join("\n") };
}

describe("PNW palette on the Space modules", () => {
  it.each(Object.entries(MODULES))(
    "%s resolves PNW tokens with no literal colour",
    (_name, css) => {
      for (const hex of RETIRED_HEX) {
        expect(css, hex).not.toContain(hex);
      }
      const code = stripComments(css);
      // Every surface resolves a token; no literal colour survives the pass.
      // rgba()/hsl() matter as much as hex — the QuickFind scrim shipped as
      // rgba(10, 8, 4, .55) (5.5's warm black) and a hex-only oracle missed it.
      expect(code).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(code).not.toMatch(/\b(?:rgba?|hsla?)\(/);
      expect(code).not.toContain("var(--violet)");
      expect(code).toMatch(
        /var\(--(bg-\d|ink|line|brass|font-|text-|measure|shadow-panel|r-(sm|md|lg))/,
      );
    },
  );
});

describe("Space sidebar — the raised surface and the one golden marker", () => {
  it("paints the sidebar on --bg-1 (the page stays --bg-0)", () => {
    expect(rule(shellCss, ".space-sidebar").body).toMatch(
      /background:\s*var\(--bg-1\)/,
    );
  });

  it("marks the current page with a 2px golden inset rule and --ink", () => {
    const current = rule(shellCss, ".space-sidebar-item-current").body;
    expect(current).toMatch(/inset\s+2px\s+0\s+0\s+var\(--brass\)/);
    expect(current).toMatch(/color:\s*var\(--ink\)/);
  });

  it("keeps every other tree link on --ink-dim", () => {
    expect(rule(shellCss, ".space-sidebar-item").body).toMatch(
      /color:\s*var\(--ink-dim\)/,
    );
    expect(sidebarTsx).toContain("space-sidebar-item-current");
    expect(sidebarTsx).toContain('aria-current={current ? "page" : undefined}');
  });

  it("reserves golden for the current marker (focus rings excepted)", () => {
    const golden = parseRules(shellCss).filter((r) =>
      r.body.includes("var(--brass"),
    );
    expect(golden.length).toBeGreaterThan(0);
    for (const r of golden) {
      expect(r.selector, r.selector).toMatch(/current|focus-visible/);
    }
  });

  it("sets the page title in the display face at --text-h1", () => {
    const h1 = rule(shellCss, ".space-page-header h1").body;
    expect(h1).toContain("var(--font-display)");
    expect(h1).toContain("var(--text-h1)");
  });
});

describe("Space sidebar — row actions stay clickable", () => {
  it("reveals rename/delete with opacity, never display", () => {
    const css = stripComments(shellCss);
    expect(css).not.toMatch(/display:\s*none/);
    expect(css).toMatch(/\.space-sidebar-action\s*\{[^}]*opacity:\s*0/);
    expect(
      rule(shellCss, ".space-sidebar-item:hover .space-sidebar-action").body,
    ).toContain("opacity: 1");
    const focusReveal = parseRules(shellCss).filter(
      (r) =>
        r.selector.includes(".space-sidebar-action:focus-visible") &&
        r.body.includes("opacity: 1"),
    );
    expect(focusReveal.length).toBeGreaterThan(0);
    expect(sidebarTsx).toContain("space-sidebar-action");
  });
});

describe("Space editor — measured prose, not the display face", () => {
  it("measures the prose column at --measure and sets body type", () => {
    expect(rule(editorCss, ".space-editor").body).toMatch(
      /max-width:\s*var\(--measure\)/,
    );
    const input = rule(editorCss, ".space-block-input").body;
    expect(input).toContain("var(--font-sans)");
    expect(input).toContain("var(--text-body)");
    expect(input).toContain("var(--text-body-leading)");
  });

  it("sets page headings in Outfit at the h2/h3 scale", () => {
    const h1 = rule(editorCss, ".space-block-heading1 .space-block-input").body;
    expect(h1).toContain("var(--font-display)");
    expect(h1).toContain("var(--text-h2)");
    const h2 = rule(editorCss, ".space-block-heading2 .space-block-input").body;
    expect(h2).toContain("var(--font-display)");
    expect(h2).toContain("var(--text-h3)");
  });

  it("sets code blocks in Geist Mono at --text-data", () => {
    const code = rule(editorCss, ".space-block-code .space-block-input").body;
    expect(code).toContain("var(--font-mono)");
    expect(code).toContain("var(--text-data)");
  });

  it("sets the meta line in mono and the dragdot handle on --ink-faint", () => {
    expect(rule(editorCss, ".space-editor-meta").body).toContain(
      "var(--font-mono)",
    );
    expect(rule(editorCss, ".space-block-handle").body).toContain(
      "var(--ink-faint)",
    );
  });

  it("puts the slash menu on --bg-2 with a golden selected row", () => {
    expect(rule(editorCss, ".space-slash").body).toContain("var(--bg-2)");
    const current = rule(editorCss, ".space-slash-item-current").body;
    expect(current).toContain("var(--brass)");
  });
});

describe("Space database table", () => {
  it("sets the header row at --text-label in --ink-faint, mono", () => {
    const th = rule(dbCss, ".space-table th").body;
    expect(th).toContain("var(--font-mono)");
    expect(th).toContain("var(--text-label)");
    expect(th).toContain("var(--ink-faint)");
  });

  it("right-aligns numbers with tabular-nums, dates and selects in mono", () => {
    const number = rule(dbCss, '.space-cell-input[type="number"]').body;
    expect(number).toMatch(/text-align:\s*right/);
    expect(number).toContain("tabular-nums");
    expect(rule(dbCss, '.space-cell-input[type="date"]').body).toContain(
      "var(--font-mono)",
    );
    expect(rule(dbCss, "select.space-cell-input").body).toContain(
      "var(--font-mono)",
    );
  });

  it("hovers rows on --bg-2 and never stripes them", () => {
    expect(dbCss).toMatch(
      /\.space-table tbody tr:hover td\s*\{[^}]*background:\s*var\(--bg-2\)/,
    );
    expect(dbCss).not.toMatch(
      /nth-child\(\s*even\s*\)|nth-of-type\(\s*even\s*\)/,
    );
  });

  it("renders property values in mono", () => {
    expect(rule(dbCss, ".space-row-prop dd").body).toContain(
      "var(--font-mono)",
    );
  });
});

describe("Space database views", () => {
  it("keeps view chips on --bg-1 with --line-strong borders", () => {
    const button = rule(viewsCss, ".space-view-switcher-button").body;
    expect(button).toContain("var(--bg-1)");
    expect(button).toContain("var(--line-strong)");
    const chip = rule(viewsCss, ".space-filter-chip").body;
    expect(chip).toContain("var(--bg-1)");
    expect(chip).toContain("var(--line-strong)");
  });

  it("marks the selected chip as that bar's one highlight", () => {
    const selected = rule(
      viewsCss,
      '.space-view-switcher-button[aria-pressed="true"]',
    ).body;
    expect(selected).toContain("var(--brass)");
    expect(selected).toContain("var(--brass-soft)");
  });
});

describe("Space board", () => {
  it("shows the drop indicator in golden and lifts the card cool", () => {
    const overlay = rule(boardCss, ".space-board-overlay").body;
    expect(overlay).toContain("var(--shadow-panel)");
    expect(overlay).not.toContain("glow-brass");
    const indicator = rule(boardCss, ".space-board-list-over").body;
    expect(indicator).toContain("var(--brass)");
    expect(boardTsx).toContain("isOver");
  });

  it("keeps the column surface on the token", () => {
    expect(rule(boardCss, ".space-board-column").body).toContain("var(--bg-1)");
  });

  it("replaces the ⋮⋮ text grip with currentColor dots", () => {
    expect(boardTsx).not.toContain("\u22EE");
    expect(boardTsx).toContain("space-board-grip-dots");
    expect(boardTsx).toContain('aria-hidden="true"');
    expect(rule(boardCss, ".space-board-grip-dots i").body).toContain(
      "currentColor",
    );
  });
});

describe("no emoji glyphs in Space surfaces", () => {
  const sources: string[] = readdirSync(join(root, "components/space"))
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => `components/space/${name}`)
    .concat([
      "app/(authenticated)/space/page.tsx",
      "app/(authenticated)/space/[id]/page.tsx",
      "app/(authenticated)/space/layout.tsx",
    ]);

  it.each(sources)("%s renders no emoji", (path) => {
    expect(EMOJI.test(read(path)), path).toBe(false);
  });

  it("keeps the doc/database/row glyphs on currentColor", () => {
    expect(iconsTsx).toContain("<svg");
    expect(iconsTsx).toContain('stroke: "currentColor"');
    expect(iconsTsx).not.toMatch(/fill:\s*"#/);
  });
});

describe("Space routes and frozen behaviour", () => {
  it("wraps the landing title in the shared pagetitle", () => {
    expect(landingPage).toContain("atrium-pagetitle");
    expect(landingPage).toContain("Pick a page");
  });

  it("keeps the page route's heading and block editor wiring", () => {
    expect(pageRoute).toContain("<h1>");
    expect(pageRoute).toContain("atrium-pagetitle");
    expect(pageRoute).toContain("space-page-header");
    expect(pageRoute).toContain("<BlockEditor");
  });

  it("freezes the editor's debounce, dnd wiring, and reorder action", () => {
    expect(editorTsx).toContain("DragDropContext");
    expect(editorTsx).toContain("addBlockAfter");
    expect(editorTsx).toContain("reorderBlocksAction");
    expect(editorTsx).toMatch(/window\.setTimeout\([\s\S]*?,\s*300\)/);
  });

  it("freezes the sidebar's server actions and accessible names", () => {
    for (const action of [
      "createPageAction",
      "renamePageAction",
      "deletePageAction",
      "createDatabaseAction",
    ]) {
      expect(sidebarTsx, action).toContain(action);
    }
    expect(sidebarTsx).toContain('aria-label="New page"');
    expect(sidebarTsx).toContain('aria-label="New database"');
  });
});
