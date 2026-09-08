import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "components/space/sidebar-tree.tsx"),
  "utf8",
);

describe("SidebarTree", () => {
  it("uses the required accessible names", () => {
    expect(source).toContain('aria-label="New page"');
    expect(source).toContain('aria-label="New database"');
    expect(source).toContain("Rename ${label}");
    expect(source).toContain("Delete ${label}");
  });

  it("navigates to the new page id before refreshing the tree", () => {
    expect(source).toContain("router.push(`/space/${created.id}`)");
    expect(source).toContain("router.refresh()");
    const pushAt = source.indexOf("router.push(`/space/${created.id}`)");
    const refreshAt = source.indexOf("router.refresh()", pushAt);
    expect(pushAt).toBeGreaterThan(-1);
    expect(refreshAt).toBeGreaterThan(pushAt);
  });
});
