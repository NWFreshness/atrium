import { describe, expect, it } from "vitest";
import { createBatchRunner, createWriteBatch } from "../db/batch-transaction";
import {
  createRecordingDb,
  statementShape,
  statementSql,
  statementsMissingTenant,
} from "../db/batch-test-helpers";
import { resetDemo } from "../tenancy/reset-demo";
import { createMemorySpaceStore, listPages } from "./queries";
import { collectSpaceReset } from "./reset";
import { seedSpace } from "./seed";

const demoTenant = "tenant-demo";
const ownerTenant = "tenant-owner";

const demoSession = {
  user: {
    id: "user-demo",
    tenantId: demoTenant,
    role: "demo" as const,
  },
};

/** The reset as it would be sent: collected against a database that records instead of running. */
async function collected() {
  const recorded = createRecordingDb();
  const batch = createWriteBatch(() => recorded.db);
  await collectSpaceReset(batch, demoTenant);
  return { ...recorded, sent: batch.statements.map(statementSql) };
}

describe("collectSpaceReset", () => {
  it("wipes then reseeds the demo tenant", async () => {
    const { sent } = await collected();
    const seeded = createMemorySpaceStore();
    await seedSpace(demoTenant, seeded);
    const names = (await listPages(demoTenant, seeded))
      .map((row) => row.title)
      .sort();

    // Every table is emptied for the tenant before the first row goes back,
    // so a stale row cannot survive whatever it was called.
    const firstInsert = sent.findIndex(({ sql }) => sql.startsWith("insert"));
    expect(firstInsert).toBe(6);
    for (const { sql, params } of sent.slice(0, firstInsert)) {
      expect(sql).toMatch(/^delete from "\w+" where "\w+"\."tenantId" = \$1$/);
      expect(params).toEqual([demoTenant]);
    }
    const reseeded = sent.filter(({ sql }) =>
      sql.startsWith('insert into "pages"'),
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
        resetDemo(async () => demoSession, [collectSpaceReset]),
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

describe("collectSpaceReset inside resetDemo", () => {
  it("sends nothing when a later resetter throws", async () => {
    const { db, batches, queries } = createRecordingDb();

    await expect(
      resetDemo(
        async () => demoSession,
        [
          collectSpaceReset,
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

describe("collectSpaceReset inside a reset batch", () => {
  it("collects the deletes in FK order, then the whole reseed, as one batch", async () => {
    const { db, batches } = createRecordingDb();
    const batch = createWriteBatch(() => db);

    await collectSpaceReset(batch, demoTenant);

    expect(batches).toHaveLength(0);

    await batch.flush();

    expect(batches).toHaveLength(1);
    const statements = batches[0] ?? [];
    expect(statements.slice(0, 6).map(statementShape)).toEqual([
      "delete from views",
      "delete from rowValues",
      "delete from propertyOptions",
      "delete from properties",
      "delete from blocks",
      "delete from pages",
    ]);
    const reseed = statements.slice(6);
    // The demo tree is a few hundred rows, all of them inserts after the wipe.
    expect(reseed.length).toBeGreaterThan(100);
    expect(
      reseed.every((row) => statementShape(row).startsWith("insert into")),
    ).toBe(true);
    for (const statement of statements) {
      expect(statementSql(statement).params).toContain(demoTenant);
    }
  });
});
