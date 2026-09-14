import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const sidebar = read("components/space/sidebar-tree.tsx");
const shellCss = read("components/space/space-shell.module.css");
const icons = read("components/space/space-icons.tsx");
const tree = read("lib/space/tree.ts");
const editorTsx = read("components/space/editor.tsx");
const editorCss = read("components/space/editor.module.css");
const dbCss = read("components/space/database-table.module.css");
const viewsCss = read("components/space/database-views.module.css");
const boardCss = read("components/space/board-view.module.css");

describe("Space tree glyphs", () => {
  it("renders inline SVG glyphs instead of emoji icons", () => {
    expect(sidebar).toContain("<SpaceGlyph");
    expect(sidebar).not.toContain("node.icon");
    expect(sidebar).not.toContain("\u25A3"); // ▣ placeholder
    expect(icons).toContain("<svg");
    expect(icons).toContain('stroke: "currentColor"');
  });

  it("carries the page type on the tree node so the glyph can differ", () => {
    expect(tree).toContain('type: Page["type"]');
    expect(tree).toContain("type: page.type");
  });
});

describe("Space sidebar", () => {
  it("adds the pages/database footer and uses Workroom tokens", () => {
    expect(sidebar).toContain("space-sidebar-footer");
    expect(sidebar).toContain("databases");
    expect(shellCss).toContain("var(--bg-1)");
    expect(shellCss).toContain("var(--brass)");
    expect(shellCss).toContain("var(--ink)");
  });
});

describe("Space editor", () => {
  it("uses dragdot handles, a meta line, and an add-block affordance", () => {
    expect(editorTsx).toContain("space-dragdots");
    expect(editorTsx).toContain("space-editor-meta");
    expect(editorTsx).toContain("space-add-block");
    expect(editorTsx).not.toContain("\u22EE"); // ⋮⋮ handle
    expect(editorTsx).toContain("addBlockAfter");
    expect(editorTsx).toContain("DragDropContext");
  });

  it("styles with tokens", () => {
    expect(editorCss).toContain("var(--brass)");
    expect(editorCss).toContain("var(--ink-faint)");
    expect(editorCss).toContain("var(--font-display)");
  });
});

describe("Space database views", () => {
  it("re-skins table / views / board with the token palette", () => {
    for (const css of [dbCss, viewsCss, boardCss]) {
      expect(css).toContain("var(--bg-1)");
      expect(css).toContain("var(--brass)");
      expect(css).toContain("var(--ink");
    }
    expect(dbCss).toContain("var(--font-mono)");
  });
});

// 10.4 extends the 5.4 palette gate rather than replacing it: the assertions
// above still hold, and the pass adds the type scale it consumes.
describe("Space PNW pass (10.4)", () => {
  it("consumes the measured type scale instead of literal sizes", () => {
    expect(shellCss).toContain("var(--text-h1)");
    expect(shellCss).toContain("var(--text-label)");
    expect(editorCss).toContain("var(--measure)");
    expect(editorCss).toContain("var(--text-body)");
    expect(editorCss).toContain("var(--text-data)");
    for (const css of [dbCss, viewsCss, boardCss]) {
      expect(css).toContain("var(--text-label)");
    }
  });

  it("retires the espresso hexes and --violet from components/space", () => {
    for (const css of [shellCss, editorCss, dbCss, viewsCss, boardCss]) {
      expect(css).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(css).not.toContain("var(--violet)");
    }
  });

  it("keeps the 5.4 row-action reveal on opacity and off display", () => {
    // Comments may name the pitfall; only declarations may not use it.
    const declarations = shellCss.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(declarations).not.toMatch(/display:\s*none/);
    expect(declarations).toMatch(
      /\.space-sidebar-action\s*\{[^}]*opacity:\s*0/,
    );
  });
});
