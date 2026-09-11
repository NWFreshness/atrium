import { createDb, type Database } from ".";
import type { BatchStatement } from "./batch-transaction";

/**
 * A `Database` that builds real statements but records the batch instead of
 * sending it to Neon.
 *
 * Nothing here connects: `createDb` is lazy, and a collected statement is only
 * ever built (`statement.toSQL()`), never run. Tests that need the SQL a reset
 * would send read it off `batches` or off the statements themselves.
 */
export function createRecordingDb(): {
  db: Database;
  batches: BatchStatement[][];
} {
  const db = createDb("postgres://atrium:atrium@127.0.0.1:5432/atrium_test");
  const batches: BatchStatement[][] = [];

  db.batch = (async (statements: BatchStatement[]) => {
    batches.push(statements);
    return statements.map(() => []);
  }) as typeof db.batch;

  return { db, batches };
}

/** The SQL a collected statement would run, for shape assertions. */
export function statementSql(statement: BatchStatement): {
  sql: string;
  params: unknown[];
} {
  return (
    statement as unknown as { toSQL(): { sql: string; params: unknown[] } }
  ).toSQL();
}

/**
 * The table-level shape of a statement — `delete from organizations`,
 * `insert into contacts` — so a reset test can assert the order of a batch
 * without pinning the whole generated SQL.
 */
export function statementShape(statement: BatchStatement): string {
  const { sql } = statementSql(statement);
  const match = /^(insert into|delete from) "(\w+)"/.exec(sql);
  return match ? `${match[1]} ${match[2]}` : sql;
}
