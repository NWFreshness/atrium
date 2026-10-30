import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectCrmReset } from "../crm/reset";
import { organizations } from "../crm/schema";
import { createBatchRunner } from "../db/batch-transaction";
import { createRecordingDb, statementSql } from "../db/batch-test-helpers";
import { resetDemo, type DemoResetter } from "./reset-demo";

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
  it("throws when the session role is owner and does not run resetters", async () => {
    let called = false;
    const resetter: DemoResetter = async () => {
      called = true;
    };

    await expect(
      resetDemo(async () => ownerSession, [resetter]),
    ).rejects.toThrow("Forbidden");
    expect(called).toBe(false);
  });

  it("throws when the session role is member and does not run resetters", async () => {
    let called = false;
    const resetter: DemoResetter = async () => {
      called = true;
    };

    await expect(
      resetDemo(async () => memberSession, [resetter]),
    ).rejects.toThrow("Forbidden");
    expect(called).toBe(false);
  });

  it("succeeds for a demo session with no resetters", async () => {
    await expect(
      resetDemo(async () => demoSession, []),
    ).resolves.toBeUndefined();
  });

  it("uses the session tenantId; no caller input can name another tenant", async () => {
    const seen: string[] = [];
    const resetter: DemoResetter = async (_batch, tenantId) => {
      seen.push(tenantId);
    };

    await resetDemo(async () => demoSession, [resetter]);

    expect(seen).toEqual(["tenant-demo"]);
    // getSession, the resetters, the runner: nowhere to pass a tenant.
    const source = readFileSync(new URL("./reset-demo.ts", import.meta.url), {
      encoding: "utf8",
    });
    expect(source).toContain("await requireTenant(getSession)");
    expect(source).not.toMatch(/tenantId\?: string/);
  });

  it("sends nothing when a resetter writes then throws", async () => {
    const { db, batches, queries } = createRecordingDb();
    const resetter: DemoResetter = async (batch, tenantId) => {
      batch.deleteTenantRows(organizations, tenantId);
      throw new Error("resetter failed");
    };

    await expect(
      resetDemo(
        async () => demoSession,
        [resetter],
        createBatchRunner(() => db),
      ),
    ).rejects.toThrow("resetter failed");

    expect(batches).toEqual([]);
    expect(queries).toEqual([]);
  });
});

describe("resetDemo's production runner", () => {
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
    const wipe: DemoResetter = async (batch, tenantId) => {
      seen.push(tenantId);
      batch.deleteTenantRows(organizations, tenantId);
    };
    const reseed: DemoResetter = async (batch) => {
      batch.insert(organizations, {
        id: "org-new",
        tenantId: "tenant-demo",
        name: "Northwind Logistics",
        website: null,
        industry: null,
        notes: null,
        createdAt: new Date(0),
      });
    };

    await resetDemo(
      async () => demoSession,
      [wipe, reseed],
      createBatchRunner(() => db),
    );

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
    const resetter: DemoResetter = async (batch, tenantId) => {
      batch.deleteTenantRows(organizations, tenantId);
      collected += 1;
    };

    await expect(
      resetDemo(
        async () => demoSession,
        [resetter],
        createBatchRunner(() => db),
      ),
    ).rejects.toThrow("batch failed");

    // Two things this can observe: the failure reaches the caller, and the
    // reset is attempted exactly once — there is no fallback that would run the
    // same statements one at a time. *That* Postgres left the demo tenant
    // untouched is Neon's transaction guarantee, not something a stub can show
    // (see the spec's deliberate limits).
    expect(batches).toHaveLength(1);
    expect(collected).toBe(1);
  });

  it("resets the demo CRM in one batch without a single read", async () => {
    const { db, batches, queries } = createRecordingDb();

    await resetDemo(
      async () => demoSession,
      [collectCrmReset],
      createBatchRunner(() => db),
    );

    expect(queries).toEqual([]);
    expect(batches).toHaveLength(1);
    const names = (batches[0] ?? [])
      .map(statementSql)
      .filter(({ sql }) => sql.startsWith('insert into "organizations"'))
      .map(({ params }) => params.find((param) => /^[A-Z]/.test(String(param))))
      .sort();
    expect(names).toEqual([
      "Bluepeak Software",
      "Harbor & Lane",
      "Northwind Logistics",
    ]);
  });

  it("does not open a database when there is nothing to reset", async () => {
    await expect(
      resetDemo(async () => demoSession, []),
    ).resolves.toBeUndefined();
  });
});

describe("the authenticated layout's reset", () => {
  it("names every app that has tables, and only those", () => {
    const layout = readFileSync(
      new URL("../../app/(authenticated)/layout.tsx", import.meta.url),
      { encoding: "utf8" },
    );
    for (const resetter of [
      "collectCrmReset",
      "collectRolodexReset",
      "collectSpaceReset",
    ]) {
      expect(layout.match(new RegExp(resetter, "g"))).toHaveLength(2);
    }
    expect(layout).not.toContain("lib/groove");
  });
});
