import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard-charts", () => {
  it("renders precomputed series without aggregating", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/crm/dashboard-charts.tsx"),
      "utf8",
    );
    expect(source).toContain("isAnimationActive={false}");
    expect(source).not.toContain("buildDashboard");
    expect(source).not.toContain("monthlyRevenue");
    expect(source).not.toContain("pipelineFunnel");
  });
});
