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