import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import type { CrmRepository } from "../crm/queries";
import { seedCrm } from "../crm/seed";
import type { RolodexRepository } from "../rolodex/queries";
import { seedRolodex } from "../rolodex/seed";
import type { SpaceRepository } from "../space/queries";
import { seedSpace } from "../space/seed";
import { getDb, type Database } from "./index";
import { hashPassword } from "./password";
import { tenants, users, type UserRole, userRoles } from "./schema";

export type SeedUserInput = {
  email: string;
  password: string;
  role: UserRole;
  tenantName: string;
};

export type SeedPlan = {
  tenants: { name: string }[];
  users: SeedUserInput[];
};

export type SeedTenant = { id: string; name: string };
export type SeedUser = {
  id: string;
  email: string;
  passwordHash: string;
  tenantId: string;
  role: UserRole;
};

export type SeedRepository = {
  upsertTenantByName(name: string): Promise<{ id: string }>;
  upsertUserByEmail(input: {
    email: string;
    passwordHash: string;
    tenantId: string;
    role: UserRole;
  }): Promise<void>;
  listTenants(): Promise<SeedTenant[]>;
  listUsers(): Promise<SeedUser[]>;
};

export function isUserRole(value: string): value is UserRole {
  return (userRoles as readonly string[]).includes(value);
}

export function parseSeedEnv(
  env: Record<string, string | undefined>,
): SeedPlan {
  const ownerEmail = env.AUTH_OWNER_EMAIL;
  const ownerPassword = env.AUTH_OWNER_PASSWORD;
  const demoEmail = env.AUTH_DEMO_EMAIL ?? "demo@atrium.local";
  const demoPassword = env.AUTH_DEMO_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    throw new Error("AUTH_OWNER_EMAIL and AUTH_OWNER_PASSWORD are required");
  }
  if (!demoPassword) {
    throw new Error("AUTH_DEMO_PASSWORD is required");
  }

  return {
    tenants: [{ name: "Owner" }, { name: "Demo" }],
    users: [
      {
        email: ownerEmail,
        password: ownerPassword,
        role: "owner",
        tenantName: "Owner",
      },
      {
        email: demoEmail,
        password: demoPassword,
        role: "demo",
        tenantName: "Demo",
      },
    ],
  };
}

export function createMemorySeedRepository(): SeedRepository & {
  tenants: SeedTenant[];
  users: SeedUser[];
} {
  const tenants: SeedTenant[] = [];
  const users: SeedUser[] = [];

  return {
    tenants,
    users,
    async upsertTenantByName(name) {
      const existing = tenants.find((tenant) => tenant.name === name);
      if (existing) {
        return { id: existing.id };
      }
      const tenant = { id: crypto.randomUUID(), name };
      tenants.push(tenant);
      return { id: tenant.id };
    },
    async upsertUserByEmail(input) {
      // Case-insensitive, like the `users_email_lower_idx` unique index and the
      // login/signup lookups: editing `AUTH_OWNER_EMAIL`'s casing must update the
      // existing account, not insert a second one.
      const existing = users.find(
        (user) => user.email.toLowerCase() === input.email.toLowerCase(),
      );
      if (existing) {
        existing.passwordHash = input.passwordHash;
        existing.tenantId = input.tenantId;
        existing.role = input.role;
        return;
      }
      users.push({
        id: crypto.randomUUID(),
        email: input.email,
        passwordHash: input.passwordHash,
        tenantId: input.tenantId,
        role: input.role,
      });
    },
    async listTenants() {
      return [...tenants];
    },
    async listUsers() {
      return [...users];
    },
  };
}

export function createDrizzleSeedRepository(db: Database): SeedRepository {
  return {
    async upsertTenantByName(name) {
      const existing = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.name, name))
        .limit(1);

      if (existing[0]) {
        return { id: existing[0].id };
      }

      const inserted = await db
        .insert(tenants)
        .values({ name })
        .onConflictDoNothing({ target: tenants.name })
        .returning({ id: tenants.id });

      if (inserted[0]) {
        return { id: inserted[0].id };
      }

      const retried = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.name, name))
        .limit(1);

      if (!retried[0]) {
        throw new Error(`Failed to upsert tenant ${name}`);
      }
      return { id: retried[0].id };
    },
    async upsertUserByEmail(input) {
      // `users.email` is unique on `lower(email)`, and Postgres cannot infer an
      // expression index from `on conflict ("email")` — that specification
      // raises 42P10 against this schema. Look the row up on the same expression
      // the index and the login path use, then update it by id.
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${input.email.toLowerCase()}`)
        .limit(1);

      if (existing[0]) {
        await db
          .update(users)
          .set({
            passwordHash: input.passwordHash,
            tenantId: input.tenantId,
            role: input.role,
          })
          .where(eq(users.id, existing[0].id));
        return;
      }

      // Untargeted: any conflict here is the lower(email) index refusing a
      // case-variant the lookup above should have found, and doing nothing is
      // the honest outcome — the insert must not clobber the address's casing.
      await db
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
          tenantId: input.tenantId,
          role: input.role,
        })
        .onConflictDoNothing();
    },
    async listTenants() {
      return db.select({ id: tenants.id, name: tenants.name }).from(tenants);
    },
    async listUsers() {
      return db
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          tenantId: users.tenantId,
          role: users.role,
        })
        .from(users);
    },
  };
}

export async function applySeed(
  repo: SeedRepository,
  plan: SeedPlan,
  hash: (plaintext: string) => Promise<string>,
): Promise<void> {
  const tenantIds = new Map<string, string>();

  for (const tenant of plan.tenants) {
    const { id } = await repo.upsertTenantByName(tenant.name);
    tenantIds.set(tenant.name, id);
  }

  for (const user of plan.users) {
    const tenantId = tenantIds.get(user.tenantName);
    if (!tenantId) {
      throw new Error(`Missing tenant ${user.tenantName}`);
    }
    const passwordHash = await hash(user.password);
    await repo.upsertUserByEmail({
      email: user.email,
      passwordHash,
      tenantId,
      role: user.role,
    });
  }
}

export async function seedDemoCrm(
  getTenantId: (
    name: string,
  ) => string | undefined | Promise<string | undefined>,
  crmRepo?: CrmRepository,
): Promise<void> {
  const demoTenantId = await getTenantId("Demo");
  if (!demoTenantId) {
    throw new Error("Demo tenant not found");
  }
  await seedCrm(demoTenantId, crmRepo);
}

export async function seedDemoSpace(
  getTenantId: (
    name: string,
  ) => string | undefined | Promise<string | undefined>,
  spaceRepo?: SpaceRepository,
): Promise<void> {
  const demoTenantId = await getTenantId("Demo");
  if (!demoTenantId) {
    throw new Error("Demo tenant not found");
  }
  await seedSpace(demoTenantId, spaceRepo);
}

export async function seedDemoRolodex(
  getTenantId: (
    name: string,
  ) => string | undefined | Promise<string | undefined>,
  rolodexRepo?: RolodexRepository,
): Promise<void> {
  const demoTenantId = await getTenantId("Demo");
  if (!demoTenantId) {
    throw new Error("Demo tenant not found");
  }
  await seedRolodex(demoTenantId, rolodexRepo);
}

export async function runSeed(
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const plan = parseSeedEnv(env);
  const db = getDb();
  const repo = createDrizzleSeedRepository(db);
  await applySeed(repo, plan, hashPassword);
  const seededTenants = await repo.listTenants();
  const demoTenantId = (name: string) =>
    seededTenants.find((tenant) => tenant.name === name)?.id;
  await seedDemoCrm(demoTenantId);
  await seedDemoSpace(demoTenantId);
  await seedDemoRolodex(demoTenantId);
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return fileURLToPath(import.meta.url) === resolve(entry);
}

if (isDirectRun()) {
  runSeed().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
