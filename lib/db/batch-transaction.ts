import { eq } from "drizzle-orm";
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
 * Resetters (and the seeds they call) are written as if they were writing to a
 * store; when they are handed a `WriteBatch` instead of a memory repository the
 * writes are collected as statements and executed by `flush()` as one batch.
 * Nothing here touches the database until then, so a failure anywhere in the
 * reset leaves the demo tenant exactly as it was.
 */
export type WriteBatch = {
  /** The collected statements, in the order they will run. */
  readonly statements: BatchStatement[];
  /** Collect one row insert. The statement is built, never executed. */
  insert<T extends PgTable>(table: T, values: T["$inferInsert"]): void;
  /** Collect `delete from <table> where "tenantId" = ?`. */
  deleteTenantRows<T extends TenantTable>(table: T, tenantId: string): void;
  /** Run every collected statement as one transaction. */
  flush(): Promise<void>;
};

/** Resolved lazily so collecting statements never opens a database on its own. */
export type DatabaseProvider = () => Database;

/**
 * Trailing options for the `createX` query helpers: when `batch` is set the
 * insert is collected into it instead of being executed. Seeds pass it down so
 * a reset's wipe and reseed can run as one transaction.
 */
export type WriteOpts = { batch?: WriteBatch };

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
): (work: (tx: unknown) => Promise<void>) => Promise<void> {
  return async (work) => {
    const batch = createWriteBatch(getDb);
    await work(batch);
    await batch.flush();
  };
}

export function isWriteBatch(value: unknown): value is WriteBatch {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as WriteBatch;
  return (
    Array.isArray(candidate.statements) &&
    typeof candidate.insert === "function" &&
    typeof candidate.deleteTenantRows === "function" &&
    typeof candidate.flush === "function"
  );
}
