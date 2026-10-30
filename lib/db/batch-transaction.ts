import { and, eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Database } from ".";

/**
 * One statement in a Neon HTTP batch.
 *
 * `drizzle-orm/neon-http` has no interactive transaction — `db.transaction()`
 * throws — so `db.batch([...])` is the only atomic write on this stack: Neon
 * sends the whole array as one transaction and rolls it back on failure.
 * Signup has always used it (`lib/auth/signup.ts`); demo reset is the other
 * write that must be all-or-nothing, because a half-wiped demo tenant is worse
 * than a reset that failed.
 */
export type BatchStatement = Parameters<Database["batch"]>[0][number];

/** `db.batch` wants a non-empty tuple, but we only know the length at runtime. */
type BatchTuple = [BatchStatement, ...BatchStatement[]];

/** Every data table in this repo carries its tenant. */
type TenantTable = PgTable & { tenantId: PgColumn };

/**
 * A write that is not run yet.
 *
 * A resetter collects its wipe and its reseed here as statements; `flush()`
 * executes them as one batch. Nothing touches the database until then, so a
 * failure anywhere in the reset leaves the demo tenant exactly as it was.
 */
export type WriteBatch = {
  /** The collected statements, in the order they will run. */
  readonly statements: BatchStatement[];
  /** Collect one row insert. The statement is built, never executed. */
  insert<T extends PgTable>(table: T, values: T["$inferInsert"]): void;
  /** Collect one tenant-scoped update by id. `undefined` keys are left alone. */
  update<T extends TenantTable & { id: PgColumn }>(
    table: T,
    tenantId: string,
    id: string,
    set: Partial<T["$inferInsert"]>,
  ): void;
  /** Collect `delete from <table> where "tenantId" = ?`. */
  deleteTenantRows<T extends TenantTable>(table: T, tenantId: string): void;
  /** Run every collected statement as one transaction. */
  flush(): Promise<void>;
};

/** Resolved lazily so collecting statements never opens a database on its own. */
export type DatabaseProvider = () => Database;

export function createWriteBatch(getDb: DatabaseProvider): WriteBatch {
  const statements: BatchStatement[] = [];
  let db: Database | undefined;
  let flushed = false;

  function require(): Database {
    db ??= getDb();
    return db;
  }

  return {
    statements,
    insert(table, values) {
      statements.push(require().insert(table).values(values));
    },
    update(table, tenantId, id, set) {
      statements.push(
        require()
          .update(table)
          .set(set as never)
          .where(and(eq(table.tenantId, tenantId), eq(table.id, id))),
      );
    },
    deleteTenantRows(table, tenantId) {
      statements.push(
        require().delete(table).where(eq(table.tenantId, tenantId)),
      );
    },
    async flush() {
      if (statements.length === 0) {
        return;
      }
      if (flushed) {
        // Re-sending a committed batch would insert every row twice; a failed
        // one rolled back, so it stays retryable.
        throw new Error("This batch has already been flushed");
      }
      await require().batch(statements as BatchTuple);
      flushed = true;
    },
  };
}

/**
 * Runs `work` against a `WriteBatch`, then commits everything it collected in
 * one transaction. This is the production `runInTransaction` for demo reset.
 */
export function createBatchRunner(
  getDb: DatabaseProvider,
): (work: (batch: WriteBatch) => Promise<void>) => Promise<void> {
  return async (work) => {
    const batch = createWriteBatch(getDb);
    await work(batch);
    await batch.flush();
  };
}

/** One row a seed wants inserted, with the table it belongs to. */
export type SeedRow = { table: PgTable; row: object };

/**
 * Runs `build` against `store` and returns every row it inserted, in order.
 * `tables` names the schema table behind each of the store's tables, so a seed
 * written against the store interface can be replayed into a `WriteBatch`.
 */
export async function recordInserts<S extends object>(
  store: S,
  tables: { [K in keyof S]?: PgTable },
  build: (store: S) => Promise<void>,
): Promise<SeedRow[]> {
  const rows: SeedRow[] = [];
  for (const [name, table] of Object.entries(tables) as [keyof S, PgTable][]) {
    const target = store[name] as {
      insert(row: object, ...rest: unknown[]): Promise<object>;
    };
    const insert = target.insert;
    target.insert = (row, ...rest) => {
      rows.push({ table, row });
      return insert(row, ...rest);
    };
  }
  await build(store);
  return rows;
}
