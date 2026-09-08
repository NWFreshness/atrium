import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("Space shell", () => {
  it("creates the layout, landing, page route, and shell files", () => {
    const files = [
      "app/(authenticated)/space/layout.tsx",
      "app/(authenticated)/space/page.tsx",
      "app/(authenticated)/space/[id]/page.tsx",
      "components/space/space-shell.tsx",
      "components/space/space-shell.module.css",
    ];

    for (const file of files) {
      expect(existsSync(resolve(root, file)), file).toBe(true);
    }
  });

  it("does not keep the Coming soon landing copy", () => {
    const landing = source("app/(authenticated)/space/page.tsx");
    expect(landing).not.toContain("Coming soon");
    expect(landing).toContain("Pick a page");
  });

  it("scopes shell class names with the space- prefix", () => {
    const css = source("components/space/space-shell.module.css");
    const classes = [...css.matchAll(/^\.([A-Za-z0-9_-]+)/gm)].map(
      (match) => match[1],
    );
    expect(classes.length).toBeGreaterThan(0);
    expect(classes.every((name) => name.startsWith("space-"))).toBe(true);
  });

  it("does not put Space styles in globals.css", () => {
    expect(source("app/globals.css")).not.toMatch(/space-/);
  });
});
