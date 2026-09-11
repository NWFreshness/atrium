import {
  createWriteBatch,
  isWriteBatch,
  type WriteBatch,
} from "../db/batch-transaction";
import { getDb } from "../db";
import { registerDemoResetter } from "../tenancy/reset-demo";
import { type CrmRepository } from "./queries";
import { activities, contacts, deals, organizations } from "./schema";
import { seedCrm } from "./seed";

function isCrmRepository(value: unknown): value is CrmRepository {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as CrmRepository;
  return (
    Array.isArray(candidate.organizations) &&
    Array.isArray(candidate.contacts) &&
    Array.isArray(candidate.deals) &&
    Array.isArray(candidate.activities)
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
 * The demo tenant's wipe and reseed as tenant-scoped statements.
 *
 * Children come before the rows they point at, both for the deletes and for the
 * inserts that follow them: the batch runs in the order it is assembled, so
 * this is the order Postgres sees.
 */
async function collectCrmReset(
  batch: WriteBatch,
  tenantId: string,
): Promise<void> {
  batch.deleteTenantRows(activities, tenantId);
  batch.deleteTenantRows(deals, tenantId);
  batch.deleteTenantRows(contacts, tenantId);
  batch.deleteTenantRows(organizations, tenantId);
  await seedCrm(tenantId, undefined, { batch });
}

export async function resetCrm(
  tx: unknown,
  tenantId: string,
  repo?: CrmRepository,
): Promise<void> {
  // An explicitly bound store is a test's memory repository: it wins, and the
  // reset never needs a database. Production resetters are registered without
  // one, so they fall through to the batch.
  const store = isCrmRepository(tx) ? tx : repo;

  if (!store) {
    if (isWriteBatch(tx)) {
      await collectCrmReset(tx, tenantId);
      return;
    }
    if (!process.env.DATABASE_URL) {
      throw new Error("CRM store required");
    }
    const batch = createWriteBatch(getDb);
    await collectCrmReset(batch, tenantId);
    await batch.flush();
    return;
  }

  wipeTenant(store.activities, tenantId);
  wipeTenant(store.deals, tenantId);
  wipeTenant(store.contacts, tenantId);
  wipeTenant(store.organizations, tenantId);
  await seedCrm(tenantId, store);
}

export function registerCrmDemoResetter(repo?: CrmRepository): void {
  registerDemoResetter(async (tx, tenantId) => {
    await resetCrm(tx, tenantId, repo);
  });
}

registerCrmDemoResetter();
