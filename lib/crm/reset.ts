import type { WriteBatch } from "../db/batch-transaction";
import { activities, contacts, deals, organizations } from "./schema";
import { crmSeedRows } from "./seed";

/**
 * The demo tenant's wipe and reseed as tenant-scoped statements.
 *
 * Children come before the rows they point at, both for the deletes and for the
 * inserts that follow them: the batch runs in the order it is assembled, so
 * this is the order Postgres sees.
 */
export async function collectCrmReset(
  batch: WriteBatch,
  tenantId: string,
): Promise<void> {
  batch.deleteTenantRows(activities, tenantId);
  batch.deleteTenantRows(deals, tenantId);
  batch.deleteTenantRows(contacts, tenantId);
  batch.deleteTenantRows(organizations, tenantId);
  for (const { table, row } of await crmSeedRows(tenantId)) {
    batch.insert(table, row);
  }
}
