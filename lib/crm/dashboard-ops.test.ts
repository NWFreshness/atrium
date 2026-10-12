import { describe, expect, it } from "vitest";
import { getDashboardIn } from "./dashboard-ops";
import {
  createDeal,
  createMemoryCrmStore,
  createOrganization,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const now = new Date("2026-09-15T12:00:00.000Z");

describe("getDashboardIn", () => {
  it("uses the session tenant and ignores a client tenantId", async () => {
    const repo = createMemoryCrmStore();
    const acme = await createOrganization(tenantA, { name: "Acme" }, repo);
    await createDeal(
      tenantA,
      {
        name: "A deal",
        organizationId: acme.id,
        stage: "New",
        value: 1000,
        probability: 10,
      },
      repo,
    );
    await createDeal(
      tenantB,
      {
        name: "B deal",
        stage: "Won",
        value: 50000,
        probability: 100,
        closeDate: new Date("2026-09-01T00:00:00.000Z"),
      },
      repo,
    );

    const dashboard = await getDashboardIn(tenantA, repo, now);

    expect(dashboard.tiles.openDealCount).toBe(1);
    expect(dashboard.tiles.pipelineValue).toBe(1000);
    expect(dashboard.tiles.revenueWon).toBe(0);
    expect(dashboard.topOrganizations).toEqual([{ name: "Acme", value: 1000 }]);
  });
});
