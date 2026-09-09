import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("database-views", () => {
  it("applies view-logic helpers instead of inline view math", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/space/database-views.tsx"),
      "utf8",
    );
    expect(source).toMatch(/applyFilters|view-logic/);
    expect(source).not.toContain("function matchesFilter");
    expect(source).not.toContain("function applyFilters");
    expect(source).not.toContain("function applySort");
    expect(source).not.toContain("function groupRows");
  });
});
