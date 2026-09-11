import { describe, expect, it } from "vitest";
import { organizations } from "../crm/schema";
import { createRecordingDb, statementSql } from "./batch-test-helpers";
import {
  createBatchRunner,
  createWriteBatch,
  isWriteBatch,
  type BatchStatement,
} from "./batch-transaction";

const tenantId = "tenant-demo";

function row(name: string) {
  return {
    id: `org-${name}`,
    tenantId,
    name,
    website: null,
    industry: null,
    notes: null,
    createdAt: new Date(0),
  };
}

describe("createWriteBatch", () => {
  it("collects statements without touching the database", () => {
    const { db, batches } = createRecordingDb();
    const batch = createWriteBatch(() => db);

    batch.insert(organizations, row("Northwind"));
    batch.deleteTenantRows(organizations, tenantId);

    expect(batch.statements).toHaveLength(2);
    expect(batches).toHaveLength(0);
  });

  it("runs every collected statement as one batch, in the order they were added", async () => {
    const { db, batches } = createRecordingDb();
    const batch = createWriteBatch(() => db);

    batch.deleteTenantRows(organizations, tenantId);
    batch.insert(organizations, row("Northwind"));
    await batch.flush();

    expect(batches).toHaveLength(1);
    expect(batches[0]).toEqual(batch.statements);
    const [deletion, insertion] = (batches[0] ?? []).map(statementSql);
    expect(deletion?.sql).toContain('delete from "organizations"');
    expect(deletion?.params).toEqual([tenantId]);
    expect(insertion?.sql).toContain('insert into "organizations"');
  });

  it("does not open a database at all when nothing was collected", async () => {
    const batch = createWriteBatch(() => {
      throw new Error("the batch must not need a database");
    });

    await expect(batch.flush()).resolves.toBeUndefined();
  });

  it("opens the database once, however many statements are collected", async () => {
    const { db } = createRecordingDb();
    let opened = 0;
    const batch = createWriteBatch(() => {
      opened += 1;
      return db;
    });

    batch.insert(organizations, row("Northwind"));
    batch.insert(organizations, row("Bluepeak"));
    batch.deleteTenantRows(organizations, tenantId);
    await batch.flush();

    expect(opened).toBe(1);
  });

  it("refuses to flush a batch twice, so a reset cannot be applied twice", async () => {
    const { db, batches } = createRecordingDb();
    const batch = createWriteBatch(() => db);
    batch.insert(organizations, row("Northwind"));

    await batch.flush();
    await expect(batch.flush()).rejects.toThrow("already been flushed");
    expect(batches).toHaveLength(1);
  });

  it("propagates a failing batch and keeps every collected statement", async () => {
    const { db, batches } = createRecordingDb();
    db.batch = (async () => {
      batches.push([]);
      throw new Error("batch failed");
    }) as typeof db.batch;

    const batch = createWriteBatch(() => db);
    batch.deleteTenantRows(organizations, tenantId);
    batch.insert(organizations, row("Northwind"));

    await expect(batch.flush()).rejects.toThrow("batch failed");
    expect(batches).toHaveLength(1);
    // Nothing was dropped or executed one statement at a time: the only write
    // path is the batch call, which failed as a unit.
    expect(batch.statements).toHaveLength(2);
  });
});

describe("createBatchRunner", () => {
  it("hands the batch to the work, then commits it once", async () => {
    const { db, batches } = createRecordingDb();
    const runInTransaction = createBatchRunner(() => db);

    await runInTransaction(async (tx) => {
      const batch = tx as ReturnType<typeof createWriteBatch>;
      batch.insert(organizations, row("Northwind"));
      batch.deleteTenantRows(organizations, tenantId);
    });

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
  });

  it("does not open a database for work that writes nothing", async () => {
    const runInTransaction = createBatchRunner(() => {
      throw new Error("the runner must not need a database");
    });

    await expect(runInTransaction(async () => {})).resolves.toBeUndefined();
  });
});

describe("isWriteBatch", () => {
  it("recognises a batch", () => {
    const { db } = createRecordingDb();
    expect(isWriteBatch(createWriteBatch(() => db))).toBe(true);
  });

  it("rejects the other things a resetter can be handed", () => {
    expect(isWriteBatch(undefined)).toBe(false);
    expect(isWriteBatch(null)).toBe(false);
    expect(isWriteBatch("tx")).toBe(false);
    expect(isWriteBatch(new Map())).toBe(false);
    expect(
      isWriteBatch({
        organizations: [],
        contacts: [],
        deals: [],
        activities: [],
      }),
    ).toBe(false);
  });
});

describe("BatchStatement", () => {
  it("is what db.batch accepts, so the collected statements typecheck", () => {
    const { db } = createRecordingDb();
    const batch = createWriteBatch(() => db);
    batch.insert(organizations, row("Northwind"));

    const statements: BatchStatement[] = batch.statements;
    expect(statements).toHaveLength(1);
  });
});
