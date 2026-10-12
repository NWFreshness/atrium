import { drizzle } from "drizzle-orm/neon-http";
import type { Database } from ".";
import * as schema from "./schema";
import type { BatchStatement } from "./batch-transaction";

export type RecordedQuery = { sql: string; params: unknown[] };

/**
 * A `Database` that builds real statements but records them instead of
 * sending them to Neon.
 *
 * Nothing here connects: the Neon client is replaced by a recorder, so an
 * awaited statement lands in `queries` (and resolves to no rows) and a batch
 * lands in `batches`. Tests that need the SQL a store or a reset would send
 * read it off those.
 */
export function createRecordingDb(): {
  db: Database;
  batches: BatchStatement[][];
  queries: RecordedQuery[];
} {
  const batches: BatchStatement[][] = [];
  const queries: RecordedQuery[] = [];
  const client = async (sql: string, params: unknown[] = []) => {
    queries.push({ sql, params });
    return { rows: [], fields: [], rowCount: 0 };
  };
  const db = drizzle({
    client: Object.assign(client, { query: client }) as never,
    schema,
  }) as Database;

  db.batch = (async (statements: BatchStatement[]) => {
    batches.push(statements);
    return statements.map(() => []);
  }) as typeof db.batch;

  return { db, batches, queries };
}

/**
 * Every statement a tenant-scoped store may send carries its tenant: an insert
 * names the column, anything else filters on it with the caller's id bound.
 * Returns the offending SQL, so an empty array is the pass.
 */
export function statementsMissingTenant(
  statements: RecordedQuery[],
  tenantId: string,
): string[] {
  return statements
    .filter(({ sql, params }) =>
      /^insert into/.test(sql)
        ? !sql.includes('"tenantId"')
        : !/ where .*"tenantId" = \$\d+/.test(sql) ||
          !params.includes(tenantId),
    )
    .map(({ sql }) => sql);
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
