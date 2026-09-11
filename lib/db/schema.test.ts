import { getTableColumns, type SQL } from "drizzle-orm";
import { getTableConfig, PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { accounts, sessions, tenants, userRoleEnum, users } from "./schema";
import * as schemaBarrel from "./schema";

/**
 * Every table that carries a tenant, and the B-tree index that makes
 * `where tenantId = ?` cheap — list, filter and demo reset all predicate on it.
 *
 * The names are stable (`<table>_tenantId_idx`, one per table) so the generated
 * migration is a plain list of CREATE INDEX statements with nothing to drop.
 */
const TENANT_SCOPED_TABLES = [
  "users",
  "organizations",
  "contacts",
  "deals",
  "activities",
  "pages",
  "blocks",
  "properties",
  "propertyOptions",
  "rowValues",
  "views",
  "people",
  "interactions",
  "importantDates",
  "facts",
  "news",
  "reminders",
  "gifts",
  "connections",
] as const;

/** The tables that are not tenant-scoped (Auth.js plus the tenant registry). */
const PLATFORM_TABLES = [
  "tenants",
  "accounts",
  "sessions",
  "verificationTokens",
  "authThrottles",
] as const;

/** The statements of a generated migration, comments stripped. */
function migrationStatements(fileName: string): {
  source: string;
  statements: string[];
} {
  const source = readFileSync(
    new URL(`../../drizzle/${fileName}`, import.meta.url),
    "utf8",
  );

  return {
    source,
    statements: source
      .split("--> statement-breakpoint")
      .map((statement) =>
        statement
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n")
          .trim(),
      )
      .filter(Boolean),
  };
}

/** The SQL an expression index is built from — `lower("email")`. */
function render(expression: unknown): string {
  return new PgDialect().sqlToQuery(expression as SQL).sql;
}

function tableNamed(name: string): PgTable {
  const table = (schemaBarrel as Record<string, unknown>)[name];
  expect(table, `${name} is exported from the schema barrel`).toBeDefined();
  return table as PgTable;
}

describe("schema", () => {
  it("defines tenants, users, accounts, and sessions", () => {
    expect(tenants).toBeDefined();
    expect(users).toBeDefined();
    expect(accounts).toBeDefined();
    expect(sessions).toBeDefined();
  });

  it("restricts user roles to owner, demo, and member", () => {
    expect(userRoleEnum.enumValues).toEqual(["owner", "demo", "member"]);
  });

  it("does not export crm, space, or rolodex tables", async () => {
    const schemaModule = await import("./schema");
    const names = Object.keys(schemaModule).map((key) => key.toLowerCase());
    expect(names.some((name) => name.includes("crm"))).toBe(false);
    expect(names.some((name) => name.includes("space"))).toBe(false);
    expect(names.some((name) => name.includes("rolodex"))).toBe(false);
  });
});

describe("tenantId indexes", () => {
  it("indexes tenantId on every tenant-scoped table", () => {
    for (const name of TENANT_SCOPED_TABLES) {
      const table = tableNamed(name);
      expect(getTableColumns(table).tenantId, `${name}.tenantId`).toBeDefined();

      const onTenantId = getTableConfig(table).indexes.filter((index) =>
        index.config.columns.some(
          (column) => "name" in column && column.name === "tenantId",
        ),
      );

      // Exactly one, named after its table, and *leading* on tenantId: a
      // composite that merely includes tenantId would not serve the
      // `where tenantId = ?` predicate the index exists for.
      expect(onTenantId, `${name} indexes tenantId`).toHaveLength(1);
      const index = onTenantId[0]!;
      expect(index.config.name).toBe(`${name}_tenantId_idx`);
      expect(
        index.config.columns.map((column) =>
          "name" in column ? column.name : String(column),
        ),
      ).toEqual(["tenantId"]);
      expect(index.config.method).toBe("btree");
      expect(index.config.unique).toBe(false);
    }
  });

  it("covers every table in the barrel that carries a tenant", () => {
    const withTenantId = Object.entries(schemaBarrel)
      .filter(([, value]) => {
        const candidate = value as Partial<PgTable> & { getSQL?: unknown };
        if (!candidate || typeof candidate !== "object" || !candidate.getSQL) {
          return false;
        }
        return "tenantId" in getTableColumns(candidate as PgTable);
      })
      .map(([name]) => name)
      .sort();

    expect(withTenantId).toEqual([...TENANT_SCOPED_TABLES].sort());
  });

  it("leaves the platform tables outside tenant scoping", () => {
    for (const name of PLATFORM_TABLES) {
      expect(
        getTableColumns(tableNamed(name)).tenantId,
        `${name} is not tenant-scoped`,
      ).toBeUndefined();
    }
  });

  it("still ships no Groove tables", () => {
    const names = Object.keys(schemaBarrel).map((key) => key.toLowerCase());
    expect(names.some((name) => name.includes("groove"))).toBe(false);
  });
});

describe("the tenantId index migration", () => {
  const { source: migration, statements } = migrationStatements(
    "0005_uneven_prodigy.sql",
  );

  it("names every index after the table it serves, on tenantId, as a plain btree", () => {
    for (const statement of statements) {
      const match =
        /^CREATE INDEX IF NOT EXISTS "(\w+)_tenantId_idx" ON "(\w+)" USING btree \("tenantId"\);$/.exec(
          statement,
        );
      expect(match, statement).not.toBeNull();
      // The name has to belong to the table in the same statement: a swap
      // between two tables would still leave the set of statements intact.
      expect(match?.[1]).toBe(match?.[2]);
    }
  });

  it("only creates indexes — nothing dropped, no RLS", () => {
    expect(statements).toHaveLength(TENANT_SCOPED_TABLES.length);
    expect(migration).not.toMatch(
      /DROP|ALTER TABLE|CREATE POLICY|ROW LEVEL SECURITY|DELETE FROM|TRUNCATE/i,
    );
  });

  it("covers the same tables the schema declares, one statement each", () => {
    const tables = statements
      .map((statement) => /ON "(\w+)"/.exec(statement)?.[1])
      .sort();
    expect(tables).toEqual([...TENANT_SCOPED_TABLES].sort());
  });
});

describe("auth_throttles", () => {
  it("has no tenantId and uniques subject", () => {
    const columns = getTableColumns(schemaBarrel.authThrottles);
    expect("tenantId" in columns).toBe(false);
    expect(columns.subject.isUnique).toBe(true);
    expect(getTableConfig(schemaBarrel.authThrottles).indexes).toEqual([]);
  });
});

describe("the lower(email) unique index", () => {
  const unique = getTableConfig(users).indexes.filter(
    (entry) => entry.config.unique,
  );

  it("uniques users.email case-insensitively, on the lower(email) expression", () => {
    expect(unique.map((entry) => entry.config.name)).toEqual([
      "users_email_lower_idx",
    ]);

    const index = unique[0]!;
    expect(index.config.method).toBe("btree");
    // An expression index carries `SQL` chunks rather than columns, so print
    // what it would render as instead of comparing object identity.
    expect(
      index.config.columns.map((column) =>
        "name" in column ? column.name : render(column),
      ),
    ).toEqual(['lower("users"."email")']);
  });

  it("no longer declares the byte-exact unique on users.email", () => {
    // A column-level `.unique()` is what drizzle-kit turns into the
    // `users_email_unique` constraint, and it never reaches
    // `getTableConfig().uniqueConstraints` — the column flag is the observable.
    expect(getTableColumns(users).email.isUnique).toBe(false);
    expect(getTableConfig(users).uniqueConstraints).toHaveLength(0);
  });
});

describe("the lower(email) migration", () => {
  const { source, statements } = migrationStatements("0006_sleepy_preak.sql");

  it("drops the byte-exact unique and creates the lower(email) unique", () => {
    expect(statements).toEqual([
      'ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";',
      'CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_idx" ON "users" USING btree (lower("email"));',
    ]);
  });

  it("rewrites nothing else — no table, enum, or policy churn", () => {
    expect(source).not.toMatch(
      /DROP TABLE|DROP TYPE|ALTER TYPE|ALTER TABLE "users" ADD|CREATE POLICY|ROW LEVEL SECURITY|DELETE FROM|TRUNCATE/i,
    );
  });
});

describe("the auth_throttles migration", () => {
  const { source, statements } = migrationStatements(
    "0007_jittery_retro_girl.sql",
  );

  it("creates auth_throttles additively with IF NOT EXISTS", () => {
    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain(
      'CREATE TABLE IF NOT EXISTS "auth_throttles"',
    );
    expect(statements[0]).toContain(
      'CONSTRAINT "auth_throttles_subject_unique" UNIQUE("subject")',
    );
  });

  it("does not drop users or tenants or add RLS", () => {
    expect(source).not.toMatch(
      /DROP TABLE|DROP TYPE|ALTER TYPE|CREATE POLICY|ROW LEVEL SECURITY|DELETE FROM|TRUNCATE/i,
    );
  });
});
