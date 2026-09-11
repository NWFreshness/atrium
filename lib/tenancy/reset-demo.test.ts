import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createMemoryCrmRepository,
  createOrganization,
  listOrganizations,
} from "../crm/queries";
import { registerCrmDemoResetter } from "../crm/reset";
import { organizations } from "../crm/schema";
import { seedCrm } from "../crm/seed";
import { createBatchRunner, type WriteBatch } from "../db/batch-transaction";
import { createRecordingDb, statementSql } from "../db/batch-test-helpers";
import {
  clearDemoResetters,
  registerDemoResetter,
  resetDemo,
} from "./reset-demo";

const ownerSession = {
  user: {
    id: "user-owner",
    tenantId: "tenant-owner",
    role: "owner" as const,
  },
};

const demoSession = {
  user: {
    id: "user-demo",
    tenantId: "tenant-demo",
    role: "demo" as const,
  },
};

const memberSession = {
  user: {
    id: "user-member",
    tenantId: "tenant-member",
    role: "member" as const,
  },
};

describe("resetDemo", () => {
  beforeEach(() => {
    clearDemoResetters();
  });

  it("throws when the session role is owner and does not run resetters", async () => {
    let called = false;
    registerDemoResetter(async () => {
      called = true;
    });

    await expect(resetDemo(async () => ownerSession)).rejects.toThrow(
      "Forbidden",
    );
    expect(called).toBe(false);
  });

  it("throws when the session role is member and does not run resetters", async () => {
    let called = false;
    registerDemoResetter(async () => {
      called = true;
    });

    await expect(resetDemo(async () => memberSession)).rejects.toThrow(
      "Forbidden",
    );
    expect(called).toBe(false);
  });

  it("succeeds for a demo session with an empty registry", async () => {
    await expect(resetDemo(async () => demoSession)).resolves.toBeUndefined();
  });

  it("uses session tenantId and ignores a client-supplied tenantId", async () => {
    const seen: string[] = [];
    registerDemoResetter(async (_tx, tenantId) => {
      seen.push(tenantId);
    });

    await resetDemo(async () => demoSession, {
      tenantId: "attacker-tenant",
    });

    expect(seen).toEqual(["tenant-demo"]);
  });

  it("rolls back when a resetter writes then throws", async () => {
    const committed = new Map<string, string>();

    async function runInTransaction(
      work: (tx: Map<string, string>) => Promise<void>,
    ): Promise<void> {
      const tx = new Map(committed);
      try {
        await work(tx);
        committed.clear();
        for (const [key, value] of tx) {
          committed.set(key, value);
        }
      } catch (error) {
        throw error;
      }
    }

    registerDemoResetter(async (tx) => {
      (tx as Map<string, string>).set("row", "wiped");
      throw new Error("resetter failed");
    });

    await expect(
      resetDemo(async () => demoSession, { runInTransaction }),
    ).rejects.toThrow("resetter failed");

    expect(committed.size).toBe(0);
  });
});

describe("resetDemo's production runner", () => {
  beforeEach(() => {
    clearDemoResetters();
  });

  it("is a Neon batch, not a no-op", () => {
    const source = readFileSync(new URL("./reset-demo.ts", import.meta.url), {
      encoding: "utf8",
    });

    expect(source).not.toContain("await work(undefined)");
    expect(source).toContain("createBatchRunner(getDb)");
  });

  it("commits every resetter's writes as one batch, for the session's tenant only", async () => {
    const { db, batches } = createRecordingDb();
    const seen: string[] = [];
    registerDemoResetter(async (tx, tenantId) => {
      seen.push(tenantId);
      (tx as WriteBatch).deleteTenantRows(organizations, tenantId);
    });
    registerDemoResetter(async (tx) => {
      (tx as WriteBatch).insert(organizations, {
        id: "org-new",
        tenantId: "tenant-demo",
        name: "Northwind Logistics",
        website: null,
        industry: null,
        notes: null,
        createdAt: new Date(0),
      });
    });

    await resetDemo(async () => demoSession, {
      runInTransaction: createBatchRunner(() => db),
    });

    expect(seen).toEqual(["tenant-demo"]);
    expect(batches).toHaveLength(1);
    const [deletion, insertion] = (batches[0] ?? []).map(statementSql);
    expect(deletion?.sql).toContain('delete from "organizations"');
    expect(deletion?.params).toEqual(["tenant-demo"]);
    expect(insertion?.sql).toContain('insert into "organizations"');
  });

  it("rejects, and does not retry statement by statement, when the batch fails", async () => {
    const { db, batches } = createRecordingDb();
    db.batch = (async () => {
      batches.push([]);
      throw new Error("batch failed");
    }) as typeof db.batch;
    let collected = 0;
    registerDemoResetter(async (tx, tenantId) => {
      (tx as WriteBatch).deleteTenantRows(organizations, tenantId);
      collected += 1;
    });

    await expect(
      resetDemo(async () => demoSession, {
        runInTransaction: createBatchRunner(() => db),
      }),
    ).rejects.toThrow("batch failed");

    // Two things this can observe: the failure reaches the caller, and the
    // reset is attempted exactly once — there is no fallback that would run the
    // same statements one at a time. *That* Postgres left the demo tenant
    // untouched is Neon's transaction guarantee, not something a stub can show
    // (see the spec's deliberate limits).
    expect(batches).toHaveLength(1);
    expect(collected).toBe(1);
  });

  it("resets a memory-backed demo tenant without ever opening a database", async () => {
    const repo = createMemoryCrmRepository();
    const demoTenantId = demoSession.user.tenantId;
    await seedCrm(demoTenantId, repo);
    await createOrganization(demoTenantId, { name: "Stale Acme" }, repo);
    registerCrmDemoResetter(repo);

    // The default runner is the production one: it must not need DATABASE_URL
    // when the resetter is bound to a memory store.
    await resetDemo(async () => demoSession);

    const orgs = await listOrganizations(demoTenantId, repo);
    expect(orgs.map((org) => org.name).sort()).toEqual([
      "Bluepeak Software",
      "Harbor & Lane",
      "Northwind Logistics",
    ]);
  });

  it("does not open a database for an empty registry", async () => {
    await expect(resetDemo(async () => demoSession)).resolves.toBeUndefined();
  });
});
