import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  createMemoryCrmRepository,
  listActivities,
  listContacts,
  listDeals,
  listOrganizations,
} from "../crm/queries";
import { createMemoryRolodexRepository, listPeople } from "../rolodex/queries";
import { createMemorySpaceRepository, listPages } from "../space/queries";
import { createDb, type Database } from "./index";
import { hashPassword } from "./password";
import { users } from "./schema";
import {
  applySeed,
  createDrizzleSeedRepository,
  createMemorySeedRepository,
  isUserRole,
  parseSeedEnv,
  seedDemoCrm,
  seedDemoRolodex,
  seedDemoSpace,
} from "./seed";

const seedEnv = {
  AUTH_OWNER_EMAIL: "owner@atrium.local",
  AUTH_OWNER_PASSWORD: "owner-secret",
  AUTH_DEMO_PASSWORD: "demo-secret",
};

describe("user roles", () => {
  it("accepts owner, demo, and member", () => {
    expect(isUserRole("owner")).toBe(true);
    expect(isUserRole("demo")).toBe(true);
    expect(isUserRole("member")).toBe(true);
    expect(isUserRole("admin")).toBe(false);
    expect(isUserRole("user")).toBe(false);
  });
});

describe("hashPassword", () => {
  it("does not return or contain the plaintext password", async () => {
    const plaintext = "owner-secret";
    const passwordHash = await hashPassword(plaintext);
    expect(passwordHash).not.toBe(plaintext);
    expect(passwordHash).not.toContain(plaintext);
  });
});

describe("parseSeedEnv", () => {
  it("maps env credentials to owner and demo users", () => {
    const plan = parseSeedEnv({
      ...seedEnv,
      AUTH_DEMO_EMAIL: "demo@example.com",
    });
    expect(plan.users.map((user) => user.role).sort()).toEqual([
      "demo",
      "owner",
    ]);
    expect(plan.users.every((user) => isUserRole(user.role))).toBe(true);
    expect(plan.users.find((user) => user.role === "owner")?.email).toBe(
      "owner@atrium.local",
    );
    expect(plan.users.find((user) => user.role === "demo")?.email).toBe(
      "demo@example.com",
    );
  });

  it("defaults demo email to demo@atrium.local when unset", () => {
    const plan = parseSeedEnv(seedEnv);
    expect(plan.users.find((user) => user.role === "demo")?.email).toBe(
      "demo@atrium.local",
    );
  });

  it("throws when owner credentials are missing", () => {
    expect(() => parseSeedEnv({ AUTH_DEMO_PASSWORD: "demo-secret" })).toThrow(
      /AUTH_OWNER_EMAIL and AUTH_OWNER_PASSWORD/,
    );
  });

  it("throws when demo password is missing", () => {
    expect(() =>
      parseSeedEnv({
        AUTH_OWNER_EMAIL: "owner@atrium.local",
        AUTH_OWNER_PASSWORD: "owner-secret",
      }),
    ).toThrow(/AUTH_DEMO_PASSWORD/);
  });
});

describe("applySeed", () => {
  it("is idempotent and stores hashes instead of plaintext", async () => {
    const repo = createMemorySeedRepository();
    const plan = parseSeedEnv(seedEnv);

    await applySeed(repo, plan, hashPassword);
    await applySeed(repo, plan, hashPassword);

    const tenants = await repo.listTenants();
    const users = await repo.listUsers();

    expect(tenants).toHaveLength(2);
    expect(users).toHaveLength(2);
    expect(new Set(users.map((user) => user.email)).size).toBe(2);

    for (const user of users) {
      const input = plan.users.find((entry) => entry.email === user.email);
      expect(input).toBeDefined();
      expect(isUserRole(user.role)).toBe(true);
      expect(user.passwordHash).not.toBe(input!.password);
      expect(user.passwordHash).not.toContain(input!.password);
    }
  });
});

describe("seedDemoCrm", () => {
  it("seeds CRM rows for Demo only and leaves Owner empty", async () => {
    const seedRepo = createMemorySeedRepository();
    const crmRepo = createMemoryCrmRepository();
    const plan = parseSeedEnv(seedEnv);

    await applySeed(seedRepo, plan, hashPassword);
    await seedDemoCrm(
      (name) => seedRepo.tenants.find((tenant) => tenant.name === name)?.id,
      crmRepo,
    );

    const demoId = seedRepo.tenants.find(
      (tenant) => tenant.name === "Demo",
    )!.id;
    const ownerId = seedRepo.tenants.find(
      (tenant) => tenant.name === "Owner",
    )!.id;

    expect((await listOrganizations(demoId, crmRepo)).length).toBeGreaterThan(
      0,
    );
    expect((await listContacts(demoId, crmRepo)).length).toBeGreaterThan(0);
    expect((await listDeals(demoId, crmRepo)).length).toBeGreaterThan(0);
    expect((await listActivities(demoId, crmRepo)).length).toBeGreaterThan(0);

    expect(await listOrganizations(ownerId, crmRepo)).toEqual([]);
    expect(await listContacts(ownerId, crmRepo)).toEqual([]);
    expect(await listDeals(ownerId, crmRepo)).toEqual([]);
    expect(await listActivities(ownerId, crmRepo)).toEqual([]);
  });

  it("throws when Demo tenant is missing", async () => {
    const crmRepo = createMemoryCrmRepository();
    await expect(seedDemoCrm(() => undefined, crmRepo)).rejects.toThrow(
      /Demo tenant/,
    );
  });
});

describe("seedDemoSpace", () => {
  it("seeds Space pages for Demo only and leaves Owner empty", async () => {
    const seedRepo = createMemorySeedRepository();
    const spaceRepo = createMemorySpaceRepository();
    const plan = parseSeedEnv(seedEnv);

    await applySeed(seedRepo, plan, hashPassword);
    await seedDemoSpace(
      (name) => seedRepo.tenants.find((tenant) => tenant.name === name)?.id,
      spaceRepo,
    );

    const demoId = seedRepo.tenants.find(
      (tenant) => tenant.name === "Demo",
    )!.id;
    const ownerId = seedRepo.tenants.find(
      (tenant) => tenant.name === "Owner",
    )!.id;

    expect((await listPages(demoId, spaceRepo)).length).toBeGreaterThan(0);
    expect(await listPages(ownerId, spaceRepo)).toEqual([]);
  });

  it("throws when Demo tenant is missing", async () => {
    const spaceRepo = createMemorySpaceRepository();
    await expect(seedDemoSpace(() => undefined, spaceRepo)).rejects.toThrow(
      /Demo tenant/,
    );
  });
});

describe("seedDemoRolodex", () => {
  it("seeds Rolodex people for Demo only and leaves Owner empty", async () => {
    const seedRepo = createMemorySeedRepository();
    const rolodexRepo = createMemoryRolodexRepository();
    const plan = parseSeedEnv(seedEnv);

    await applySeed(seedRepo, plan, hashPassword);
    await seedDemoRolodex(
      (name) => seedRepo.tenants.find((tenant) => tenant.name === name)?.id,
      rolodexRepo,
    );

    const demoId = seedRepo.tenants.find(
      (tenant) => tenant.name === "Demo",
    )!.id;
    const ownerId = seedRepo.tenants.find(
      (tenant) => tenant.name === "Owner",
    )!.id;

    expect((await listPeople(demoId, rolodexRepo)).length).toBeGreaterThan(0);
    expect(await listPeople(ownerId, rolodexRepo)).toEqual([]);
  });

  it("throws when Demo tenant is missing", async () => {
    const rolodexRepo = createMemoryRolodexRepository();
    await expect(seedDemoRolodex(() => undefined, rolodexRepo)).rejects.toThrow(
      /Demo tenant/,
    );
  });
});

describe("upsertUserByEmail", () => {
  const input = {
    email: "Owner@Atrium.local",
    passwordHash: "hashed",
    tenantId: "tenant-1",
    role: "owner" as const,
  };

  it("matches a stored case variant, as the lower(email) unique index does", async () => {
    const repo = createMemorySeedRepository();

    await repo.upsertUserByEmail({
      ...input,
      email: "owner@atrium.local",
      passwordHash: "first",
    });
    await repo.upsertUserByEmail(input);

    expect(repo.users).toHaveLength(1);
    expect(repo.users[0]?.email).toBe("owner@atrium.local");
    expect(repo.users[0]?.passwordHash).toBe("hashed");
  });

  it("looks the row up on lower(email) and updates it, never rewriting the stored address", async () => {
    const { db, sent } = capturingSeedDb([{ id: "user-1" }]);

    await createDrizzleSeedRepository(db).upsertUserByEmail(input);

    expect(sent.select).toHaveLength(1);
    expect(sent.select[0]?.sql).toMatch(/lower\("users"\."email"\) = \$\d+/);
    expect(sent.select[0]?.params[0]).toBe("owner@atrium.local");

    expect(sent.insert).toEqual([]);
    expect(sent.update).toHaveLength(1);
    const update = sent.update[0]!;
    expect(update.sql).toMatch(/^update "users" set "passwordHash" = \$\d+/);
    expect(update.sql).toContain('where "users"."id" =');
    expect(update.params).toEqual(["hashed", "tenant-1", "owner", "user-1"]);
    // The address keeps the casing it was stored with, exactly as the
    // `on conflict … do update` this replaced did.
    expect(update.sql).not.toContain('"email"');
  });

  it("inserts verbatim, with no conflict target the lower(email) index cannot serve", async () => {
    const { db, sent } = capturingSeedDb([]);

    await createDrizzleSeedRepository(db).upsertUserByEmail(input);

    expect(sent.select).toHaveLength(1);
    expect(sent.update).toEqual([]);
    expect(sent.insert).toHaveLength(1);
    const insert = sent.insert[0]!;
    expect(insert.sql).toMatch(/on conflict do nothing$/);
    expect(insert.sql).not.toMatch(/on conflict \(/);
    expect(insert.params).toContain("Owner@Atrium.local");
    expect(insert.params).toContain("owner");
  });
});

type SentStatement = { sql: string; params: unknown[] };

/**
 * A `Database` stubbed down to the three chains `upsertUserByEmail` walks.
 *
 * Nothing connects: the statements are rebuilt on a lazy real client
 * (`createDb` only formats SQL until a statement is executed) so the recorded
 * SQL is drizzle's own rendering of the values and conditions the repository
 * passed, rather than a string the test wrote.
 */
function capturingSeedDb(existing: { id: string }[]): {
  db: Database;
  sent: {
    select: SentStatement[];
    update: SentStatement[];
    insert: SentStatement[];
  };
} {
  const real = createDb("postgres://atrium:***@127.0.0.1:5432/atrium_test");
  const sent = {
    select: [] as SentStatement[],
    update: [] as SentStatement[],
    insert: [] as SentStatement[],
  };

  const built = (statement: { toSQL(): SentStatement }): SentStatement =>
    statement.toSQL();

  const db = {
    select: () => ({
      from: () => ({
        where: (condition: SQL) => ({
          limit: async () => {
            sent.select.push(
              built(
                real
                  .select({ id: users.id })
                  .from(users)
                  .where(condition)
                  .limit(1),
              ),
            );
            return existing;
          },
        }),
      }),
    }),
    update: () => ({
      set: (values: never) => ({
        where: async (condition: SQL) => {
          sent.update.push(
            built(real.update(users).set(values).where(condition)),
          );
        },
      }),
    }),
    insert: () => ({
      values: (values: never) => ({
        onConflictDoNothing: async () => {
          sent.insert.push(
            built(real.insert(users).values(values).onConflictDoNothing()),
          );
        },
      }),
    }),
  } as unknown as Database;

  return { db, sent };
}
