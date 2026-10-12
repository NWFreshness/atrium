import { describe, expect, it } from "vitest";
import { MAX_MONEY } from "../input/numbers";
import { MAX_LONG_TEXT, MAX_SHORT_TEXT } from "../input/text";
import { DEAL_STAGES } from "./constants";
import { createDeal, type Deal } from "./queries";
import { activities, contacts, deals, organizations } from "./schema";
import { crmSeedRows } from "./seed";
import { STAGE_PROBABILITY } from "./constants";
import {
  createMemoryCrmStore,
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
    const repo = createMemoryCrmStore();

    await seedCrm(demoTenant, repo);

    const demoOrgs = await listOrganizations(demoTenant, repo);
    const ownerOrgs = await listOrganizations(ownerTenant, repo);

    expect(demoOrgs.map((org) => org.name).sort()).toEqual(
      ["Bluepeak Software", "Harbor & Lane", "Northwind Logistics"].sort(),
    );
    expect(ownerOrgs).toEqual([]);
  });

  it("seeds several contacts, deals across Won/Lost/open, and activities on demo only", async () => {
    const repo = createMemoryCrmStore();

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
    const repo = createMemoryCrmStore();

    await seedCrm(demoTenant, repo);
    const afterFirst = (await listOrganizations(demoTenant, repo)).length;

    await seedCrm(demoTenant, repo);
    const afterSecond = (await listOrganizations(demoTenant, repo)).length;

    expect(afterSecond).toBe(afterFirst);
  });
});

describe("crmSeedRows", () => {
  it("builds the reset's rows, every one inside the limits the create functions enforce", async () => {
    const rows = await crmSeedRows(demoTenant);
    const byTable = (table: object) =>
      rows.filter((entry) => entry.table === table).map((entry) => entry.row);

    expect(rows.map((entry) => entry.table)).toEqual([
      ...Array(3).fill(organizations),
      ...Array(4).fill(contacts),
      ...Array(6).fill(deals),
      ...Array(4).fill(activities),
    ]);
    for (const { row } of rows) {
      expect(row).toMatchObject({ tenantId: demoTenant });
      for (const [key, value] of Object.entries(row)) {
        if (typeof value !== "string") continue;
        const limit =
          key === "notes" || key === "description"
            ? MAX_LONG_TEXT
            : MAX_SHORT_TEXT;
        expect(value.length, key).toBeLessThanOrEqual(limit);
      }
    }
    for (const deal of byTable(deals) as Deal[]) {
      expect(deal.value).toBeGreaterThanOrEqual(0);
      expect(deal.value).toBeLessThanOrEqual(MAX_MONEY);
      expect(Number.isInteger(deal.probability)).toBe(true);
      expect(deal.probability).toBeGreaterThanOrEqual(0);
      expect(deal.probability).toBeLessThanOrEqual(100);
      expect(DEAL_STAGES).toContain(deal.stage);
    }
  });

  it("is refused by the same checks when a seed row breaks a limit", async () => {
    const store = createMemoryCrmStore();
    await expect(
      createDeal(
        demoTenant,
        { name: "x".repeat(MAX_SHORT_TEXT + 1), stage: "New", value: 1 },
        store,
      ),
    ).rejects.toThrow("text too long");
    await expect(
      createDeal(
        demoTenant,
        { name: "Too rich", stage: "New", value: MAX_MONEY + 1 },
        store,
      ),
    ).rejects.toThrow("invalid money");
  });
});
