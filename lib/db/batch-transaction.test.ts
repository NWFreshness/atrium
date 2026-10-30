import { describe, expect, it } from "vitest";
import { organizations } from "../crm/schema";
import {
  createRecordingDb,
  statementSql,
  statementsMissingTenant,
} from "./batch-test-helpers";
import {
  createBatchRunner,
  createWriteBatch,
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

describe("BatchStatement", () => {
  it("is what db.batch accepts, so the collected statements typecheck", () => {
    const { db } = createRecordingDb();
    const batch = createWriteBatch(() => db);
    batch.insert(organizations, row("Northwind"));

    const statements: BatchStatement[] = batch.statements;
    expect(statements).toHaveLength(1);
  });
});

describe("statementsMissingTenant", () => {
  const tenant = "tenant-a";

  it("passes statements that filter on or insert the tenant", () => {
    expect(
      statementsMissingTenant(
        [
          {
            sql: 'select "id" from "people" where ("people"."tenantId" = $1 and "people"."id" = $2)',
            params: [tenant, "p1"],
          },
          {
            sql: 'insert into "people" ("id", "tenantId") values ($1, $2)',
            params: ["p1", tenant],
          },
        ],
        tenant,
      ),
    ).toEqual([]);
  });

  it("flags a keyed statement with no tenant predicate, or another tenant bound", () => {
    const unscoped = 'delete from "people" where "people"."id" = $1';
    const scoped =
      'update "people" set "name" = $1 where "people"."tenantId" = $2';
    expect(
      statementsMissingTenant(
        [
          { sql: unscoped, params: ["p1"] },
          { sql: scoped, params: ["x", "tenant-b"] },
          { sql: 'insert into "people" ("id") values ($1)', params: ["p1"] },
        ],
        tenant,
      ),
    ).toEqual([unscoped, scoped, 'insert into "people" ("id") values ($1)']);
  });
});

describe("WriteBatch.update", () => {
  it("collects a tenant-scoped update by id without running it", async () => {
    const { db, batches, queries } = createRecordingDb();
    const batch = createWriteBatch(() => db);

    batch.update(organizations, "tenant-a", "o1", { name: "Renamed" });

    expect(queries).toEqual([]);
    expect(batches).toEqual([]);
    const { sql, params } = statementSql(batch.statements[0]!);
    expect(sql).toMatch(/^update "organizations" set "name" = \$1 where /);
    expect(params).toEqual(["Renamed", "tenant-a", "o1"]);
    expect(statementsMissingTenant([{ sql, params }], "tenant-a")).toEqual([]);

    await batch.flush();
    expect(batches).toHaveLength(1);
  });
});
