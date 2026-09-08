import { beforeEach, describe, expect, it } from "vitest";
import {
  createMemoryCrmRepository,
  createOrganization,
  listOrganizations,
  type CrmRepository,
} from "./queries";
import { registerCrmDemoResetter, resetCrm } from "./reset";
import { seedCrm } from "./seed";
import {
  clearDemoResetters,
  registerDemoResetter,
  resetDemo,
} from "../tenancy/reset-demo";

const demoTenant = "tenant-demo";
const ownerTenant = "tenant-owner";

const demoSession = {
  user: {
    id: "user-demo",
    tenantId: demoTenant,
    role: "demo" as const,
  },
};

const BENCH_ORGS = [
  "Bluepeak Software",
  "Harbor & Lane",
  "Northwind Logistics",
];

function cloneRepo(repo: CrmRepository): CrmRepository {
  return {
    organizations: repo.organizations.map((row) => ({ ...row })),
    contacts: repo.contacts.map((row) => ({ ...row })),
    deals: repo.deals.map((row) => ({ ...row })),
    activities: repo.activities.map((row) => ({ ...row })),
  };
}

function commitRepo(target: CrmRepository, source: CrmRepository): void {
  target.organizations.splice(
    0,
    target.organizations.length,
    ...source.organizations,
  );
  target.contacts.splice(0, target.contacts.length, ...source.contacts);
  target.deals.splice(0, target.deals.length, ...source.deals);
  target.activities.splice(0, target.activities.length, ...source.activities);
}

describe("resetCrm", () => {
  it("wipes then reseeds the demo tenant", async () => {
    const repo = createMemoryCrmRepository();
    await seedCrm(demoTenant, repo);
    await createOrganization(demoTenant, { name: "Stale Acme" }, repo);

    await resetCrm(undefined, demoTenant, repo);

    const orgs = await listOrganizations(demoTenant, repo);
    expect(orgs.map((org) => org.name).sort()).toEqual(BENCH_ORGS);
    expect(orgs.some((org) => org.name === "Stale Acme")).toBe(false);
  });

  it("does not change the owner tenant", async () => {
    const repo = createMemoryCrmRepository();
    await seedCrm(demoTenant, repo);
    await createOrganization(ownerTenant, { name: "Owner Co" }, repo);

    await resetCrm(undefined, demoTenant, repo);

    const ownerOrgs = await listOrganizations(ownerTenant, repo);
    expect(ownerOrgs.map((org) => org.name)).toEqual(["Owner Co"]);
  });
});

describe("registerCrmDemoResetter", () => {
  beforeEach(() => {
    clearDemoResetters();
  });

  it("rolls back when a resetter throws inside injected runInTransaction", async () => {
    const committed = createMemoryCrmRepository();
    await seedCrm(demoTenant, committed);
    await createOrganization(demoTenant, { name: "Stale Acme" }, committed);

    async function runInTransaction(
      work: (tx: CrmRepository) => Promise<void>,
    ): Promise<void> {
      const tx = cloneRepo(committed);
      try {
        await work(tx);
        commitRepo(committed, tx);
      } catch (error) {
        throw error;
      }
    }

    registerCrmDemoResetter(committed);
    registerDemoResetter(async () => {
      throw new Error("resetter failed");
    });

    await expect(
      resetDemo(async () => demoSession, { runInTransaction }),
    ).rejects.toThrow("resetter failed");

    const orgs = await listOrganizations(demoTenant, committed);
    expect(orgs.some((org) => org.name === "Stale Acme")).toBe(true);
  });
});
