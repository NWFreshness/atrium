import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { createWriteBatch } from "../db/batch-transaction";
import {
  createRecordingDb,
  statementShape,
  statementSql,
} from "../db/batch-test-helpers";
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

const REFERENCE_ORGS = [
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
    expect(orgs.map((org) => org.name).sort()).toEqual(REFERENCE_ORGS);
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

  it("throws when no memory repo and no DATABASE_URL", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(resetCrm(undefined, demoTenant)).rejects.toThrow(
        "CRM store required",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previous;
      }
    }
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

describe("resetCrm inside a reset batch", () => {
  it("collects the demo tenant's deletes and its reseed as one batch", async () => {
    const { db, batches } = createRecordingDb();
    const batch = createWriteBatch(() => db);

    await resetCrm(batch, demoTenant);

    // Collected, not executed: nothing reaches the database until the batch
    // the whole reset shares is flushed.
    expect(batches).toHaveLength(0);

    await batch.flush();

    expect(batches).toHaveLength(1);
    const statements = batches[0] ?? [];
    expect(statements.map(statementShape)).toEqual([
      "delete from activities",
      "delete from deals",
      "delete from contacts",
      "delete from organizations",
      ...Array(3).fill("insert into organizations"),
      ...Array(4).fill("insert into contacts"),
      ...Array(6).fill("insert into deals"),
      ...Array(4).fill("insert into activities"),
    ]);
    expect(statements).toHaveLength(21);
    for (const statement of statements) {
      expect(statementSql(statement).params).toContain(demoTenant);
    }
  });

  it("wipes with tenant-scoped deletes instead of listing rows and deleting them one by one", () => {
    const source = readFileSync(new URL("./reset.ts", import.meta.url), {
      encoding: "utf8",
    });

    expect(source).not.toMatch(
      /list(Activities|Deals|Contacts|Organizations)\(/,
    );
    expect(source).not.toMatch(/delete(Activity|Deal|Contact|Organization)\(/);
    expect(source).toContain("deleteTenantRows");
  });
});
