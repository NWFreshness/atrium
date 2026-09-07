import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("home page", () => {
  it("includes the word Atrium", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/(authenticated)/page.tsx"),
      "utf8",
    );
    expect(source).toContain("Atrium");
  });
});
