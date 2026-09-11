import {
  createWriteBatch,
  isWriteBatch,
  type WriteBatch,
} from "../db/batch-transaction";
import { getDb } from "../db";
import { registerDemoResetter } from "../tenancy/reset-demo";
import { type RolodexRepository } from "./queries";
import {
  connections,
  facts,
  gifts,
  importantDates,
  interactions,
  news,
  people,
  reminders,
} from "./schema";
import { seedRolodex } from "./seed";

function isRolodexRepository(value: unknown): value is RolodexRepository {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as RolodexRepository;
  return (
    Array.isArray(candidate.people) &&
    Array.isArray(candidate.interactions) &&
    Array.isArray(candidate.importantDates) &&
    Array.isArray(candidate.facts) &&
    Array.isArray(candidate.news) &&
    Array.isArray(candidate.reminders) &&
    Array.isArray(candidate.gifts) &&
    Array.isArray(candidate.connections)
  );
}

function wipeTenant<T extends { tenantId: string }>(
  rows: T[],
  tenantId: string,
): void {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i]!.tenantId === tenantId) {
      rows.splice(i, 1);
    }
  }
}

/**
 * The demo tenant's wipe and reseed as tenant-scoped statements: everything
 * hangs off a person (and connections point at two), so the children go first
 * and the people are inserted before the rows that reference them.
 */
async function collectRolodexReset(
  batch: WriteBatch,
  tenantId: string,
): Promise<void> {
  batch.deleteTenantRows(connections, tenantId);
  batch.deleteTenantRows(gifts, tenantId);
  batch.deleteTenantRows(reminders, tenantId);
  batch.deleteTenantRows(news, tenantId);
  batch.deleteTenantRows(facts, tenantId);
  batch.deleteTenantRows(importantDates, tenantId);
  batch.deleteTenantRows(interactions, tenantId);
  batch.deleteTenantRows(people, tenantId);
  await seedRolodex(tenantId, undefined, { batch });
}

export async function resetRolodex(
  tx: unknown,
  tenantId: string,
  repo?: RolodexRepository,
): Promise<void> {
  // An explicitly bound store is a test's memory repository: it wins, and the
  // reset never needs a database. Production resetters are registered without
  // one, so they fall through to the batch.
  const store = isRolodexRepository(tx) ? tx : repo;

  if (!store) {
    if (isWriteBatch(tx)) {
      await collectRolodexReset(tx, tenantId);
      return;
    }
    if (!process.env.DATABASE_URL) {
      throw new Error("Rolodex store required");
    }
    const batch = createWriteBatch(getDb);
    await collectRolodexReset(batch, tenantId);
    await batch.flush();
    return;
  }

  wipeTenant(store.connections, tenantId);
  wipeTenant(store.gifts, tenantId);
  wipeTenant(store.reminders, tenantId);
  wipeTenant(store.news, tenantId);
  wipeTenant(store.facts, tenantId);
  wipeTenant(store.importantDates, tenantId);
  wipeTenant(store.interactions, tenantId);
  wipeTenant(store.people, tenantId);
  await seedRolodex(tenantId, store);
}

export function registerRolodexDemoResetter(repo?: RolodexRepository): void {
  registerDemoResetter(async (tx, tenantId) => {
    await resetRolodex(tx, tenantId, repo);
  });
}

registerRolodexDemoResetter();
