import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBatchRunner, createWriteBatch } from "../db/batch-transaction";
import {
  createRecordingDb,
  statementShape,
  statementSql,
  statementsMissingTenant,
} from "../db/batch-test-helpers";
import { resetDemo } from "../tenancy/reset-demo";
import { createMemoryCrmStore, listOrganizations } from "./queries";
import { collectCrmReset } from "./reset";
import { seedCrm } from "./seed";

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

/** The reset as it would be sent: collected against a database that records instead of running. */
async function collected() {
  const recorded = createRecordingDb();
  const batch = createWriteBatch(() => recorded.db);
  await collectCrmReset(batch, demoTenant);
  return { ...recorded, sent: batch.statements.map(statementSql) };
}

describe("collectCrmReset", () => {
  it("wipes then reseeds the demo tenant", async () => {
    const { sent } = await collected();
    const seeded = createMemoryCrmStore();
    await seedCrm(demoTenant, seeded);
    const names = (await listOrganizations(demoTenant, seeded))
      .map((row) => row.name)
      .sort();
    expect(names).toEqual(REFERENCE_ORGS);

    // Every table is emptied for the tenant before the first row goes back,
    // so a stale row cannot survive whatever it was called.
    const firstInsert = sent.findIndex(({ sql }) => sql.startsWith("insert"));
    expect(firstInsert).toBe(4);
    for (const { sql, params } of sent.slice(0, firstInsert)) {
      expect(sql).toMatch(/^delete from "\w+" where "\w+"\."tenantId" = \$1$/);
      expect(params).toEqual([demoTenant]);
    }
    const reseeded = sent.filter(({ sql }) =>
      sql.startsWith('insert into "organizations"'),
    );
    expect(reseeded).toHaveLength(names.length);
    for (const name of names) {
      expect(
        reseeded.some(({ params }) => params.includes(name)),
        name,
      ).toBe(true);
    }
  });

  it("does not change the owner tenant", async () => {
    const { sent } = await collected();
    expect(statementsMissingTenant(sent, demoTenant)).toEqual([]);
    expect(sent.some(({ params }) => params.includes(ownerTenant))).toBe(false);
  });

  it("reads nothing and sends nothing while it collects", async () => {
    const { queries, batches } = await collected();
    expect(queries).toEqual([]);
    expect(batches).toEqual([]);
  });

  it("fails without DATABASE_URL instead of reporting a reset that did nothing", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(
        resetDemo(async () => demoSession, [collectCrmReset]),
      ).rejects.toThrow("DATABASE_URL is required");
    } finally {
      if (previous === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previous;
      }
    }
  });
});

describe("collectCrmReset inside resetDemo", () => {
  it("sends nothing when a later resetter throws", async () => {
    const { db, batches, queries } = createRecordingDb();

    await expect(
      resetDemo(
        async () => demoSession,
        [
          collectCrmReset,
          async () => {
            throw new Error("resetter failed");
          },
        ],
        createBatchRunner(() => db),
      ),
    ).rejects.toThrow("resetter failed");

    expect(batches).toEqual([]);
    expect(queries).toEqual([]);
  });
});

describe("collectCrmReset inside a reset batch", () => {
  it("collects the demo tenant's deletes and its reseed as one batch", async () => {
    const { db, batches } = createRecordingDb();
    const batch = createWriteBatch(() => db);

    await collectCrmReset(batch, demoTenant);

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
