import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("org-table", () => {
  it("uses @tanstack/react-table", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/crm/org-table.tsx"),
      "utf8",
    );
    expect(source).toContain("@tanstack/react-table");
  });
});
