import {
  createWriteBatch,
  isWriteBatch,
  type WriteBatch,
} from "../db/batch-transaction";
import { getDb } from "../db";
import { registerDemoResetter } from "../tenancy/reset-demo";
import { type SpaceRepository } from "./queries";
import {
  blocks,
  pages,
  properties,
  propertyOptions,
  rowValues,
  views,
} from "./schema";
import { seedSpace } from "./seed";

function isSpaceRepository(value: unknown): value is SpaceRepository {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as SpaceRepository;
  return (
    Array.isArray(candidate.pages) &&
    Array.isArray(candidate.blocks) &&
    Array.isArray(candidate.properties) &&
    Array.isArray(candidate.propertyOptions) &&
    Array.isArray(candidate.rowValues) &&
    Array.isArray(candidate.views)
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
 * The demo tenant's wipe and reseed as tenant-scoped statements: views point at
 * pages and rows point at properties, so children are deleted first and the
 * pages go back in before the rows that hang off them.
 */
async function collectSpaceReset(
  batch: WriteBatch,
  tenantId: string,
): Promise<void> {
  batch.deleteTenantRows(views, tenantId);
  batch.deleteTenantRows(rowValues, tenantId);
  batch.deleteTenantRows(propertyOptions, tenantId);
  batch.deleteTenantRows(properties, tenantId);
  batch.deleteTenantRows(blocks, tenantId);
  batch.deleteTenantRows(pages, tenantId);
  await seedSpace(tenantId, undefined, { batch });
}

export async function resetSpace(
  tx: unknown,
  tenantId: string,
  repo?: SpaceRepository,
): Promise<void> {
  // An explicitly bound store is a test's memory repository: it wins, and the
  // reset never needs a database. Production resetters are registered without
  // one, so they fall through to the batch.
  const store = isSpaceRepository(tx) ? tx : repo;

  if (!store) {
    if (isWriteBatch(tx)) {
      await collectSpaceReset(tx, tenantId);
      return;
    }
    if (!process.env.DATABASE_URL) {
      throw new Error("Space store required");
    }
    const batch = createWriteBatch(getDb);
    await collectSpaceReset(batch, tenantId);
    await batch.flush();
    return;
  }

  wipeTenant(store.views, tenantId);
  wipeTenant(store.rowValues, tenantId);
  wipeTenant(store.propertyOptions, tenantId);
  wipeTenant(store.properties, tenantId);
  wipeTenant(store.blocks, tenantId);
  wipeTenant(store.pages, tenantId);
  await seedSpace(tenantId, store);
}

export function registerSpaceDemoResetter(repo?: SpaceRepository): void {
  registerDemoResetter(async (tx, tenantId) => {
    await resetSpace(tx, tenantId, repo);
  });
}

registerSpaceDemoResetter();
