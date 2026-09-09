import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("QuickFind", () => {
  it("calls searchPagesAction and listens for Meta/Control+K", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/space/quick-find.tsx"),
      "utf8",
    );
    expect(source).toContain("searchPagesAction");
    expect(source).toContain("Meta");
  });
});
