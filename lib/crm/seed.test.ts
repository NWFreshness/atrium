import { describe, expect, it } from "vitest";
import { STAGE_PROBABILITY } from "./constants";
import {
  createMemoryCrmRepository,
  listActivities,
  listContacts,
  listDeals,
  listOrganizations,
} from "./queries";
import { seedCrm } from "./seed";

const demoTenant = "tenant-demo";
const ownerTenant = "tenant-owner";

describe("seedCrm", () => {
  it("populates the demo tenant with the reference organizations and leaves owner empty", async () => {
    const repo = createMemoryCrmRepository();

    await seedCrm(demoTenant, repo);

    const demoOrgs = await listOrganizations(demoTenant, repo);
    const ownerOrgs = await listOrganizations(ownerTenant, repo);

    expect(demoOrgs.map((org) => org.name).sort()).toEqual(
      ["Bluepeak Software", "Harbor & Lane", "Northwind Logistics"].sort(),
    );
    expect(ownerOrgs).toEqual([]);
  });

  it("seeds several contacts, deals across Won/Lost/open, and activities on demo only", async () => {
    const repo = createMemoryCrmRepository();

    await seedCrm(demoTenant, repo);

    const contacts = await listContacts(demoTenant, repo);
    const deals = await listDeals(demoTenant, repo);
    const activities = await listActivities(demoTenant, repo);

    expect(contacts.length).toBeGreaterThanOrEqual(3);
    expect(deals.length).toBeGreaterThanOrEqual(3);
    expect(activities.length).toBeGreaterThanOrEqual(2);

    const stages = new Set(deals.map((deal) => deal.stage));
    expect(stages.has("Won")).toBe(true);
    expect(stages.has("Lost")).toBe(true);
    expect(
      deals.some((deal) => deal.stage !== "Won" && deal.stage !== "Lost"),
    ).toBe(true);

    for (const deal of deals) {
      expect(deal.probability).toBe(STAGE_PROBABILITY[deal.stage]);
    }

    expect(await listContacts(ownerTenant, repo)).toEqual([]);
    expect(await listDeals(ownerTenant, repo)).toEqual([]);
    expect(await listActivities(ownerTenant, repo)).toEqual([]);
  });

  it("is a no-op when the tenant already has organizations", async () => {
    const repo = createMemoryCrmRepository();

    await seedCrm(demoTenant, repo);
    const afterFirst = (await listOrganizations(demoTenant, repo)).length;

    await seedCrm(demoTenant, repo);
    const afterSecond = (await listOrganizations(demoTenant, repo)).length;

    expect(afterSecond).toBe(afterFirst);
  });
});
