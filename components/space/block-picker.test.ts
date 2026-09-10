import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const editor = readFileSync(
  resolve(process.cwd(), "components/space/editor.tsx"),
  "utf8",
);
const constants = readFileSync(
  resolve(process.cwd(), "lib/space/constants.ts"),
  "utf8",
);

describe("add-block picker", () => {
  it("offers the shared block menu rather than a second hardcoded list", () => {
    // BLOCK_MENU is the single source of block types (constants.ts). A picker that
    // hand-rolls its own items drifts the moment a type is added.
    expect(constants).toContain("export const BLOCK_MENU");
    expect(editor).toMatch(/BLOCK_MENU\.map\(/);
    expect(editor).not.toMatch(/const ADD_BLOCK_ITEMS|const PICKER_ITEMS/);
  });

  it("creates the type the user picked instead of always adding text", () => {
    // The original affordance promised "text, list, divider…" and always created a
    // paragraph; these two assertions are the regression guard for that.
    expect(editor).toMatch(/addBlockAfter\([\s\S]{0,80}type: BlockType/);
    expect(editor).toContain("defaultContent(type)");
    expect(editor).not.toMatch(/createBlockAction\(\{[^}]*type:\s*"paragraph"/);
  });

  it("exposes the picker as an accessible menu button", () => {
    expect(editor).toContain('aria-haspopup="listbox"');
    expect(editor).toContain("aria-expanded={addMenuOpen}");
    expect(editor).toContain('aria-label="Add a block"');
    expect(editor).toContain('aria-label="Block types"');
    expect(editor).toContain('role="option"');
  });

  it("closes the picker without adding anything on Escape", () => {
    expect(editor).toContain('"Escape"');
  });

  it("keeps the names the pass test and e2e rely on", () => {
    expect(editor).toContain("space-add-block");
    expect(editor).toContain("addBlockAfter");
  });
});
