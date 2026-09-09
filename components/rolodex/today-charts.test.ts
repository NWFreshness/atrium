import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("today-charts", () => {
  it("renders precomputed series without aggregating", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/rolodex/today-charts.tsx"),
      "utf8",
    );
    expect(source).toContain("isAnimationActive={false}");
    expect(source).not.toContain("whoToContact");
    expect(source).not.toContain("interactionsPerMonth");
    expect(source).not.toContain("peoplePerCircle");
  });
});
