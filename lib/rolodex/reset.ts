import type { WriteBatch } from "../db/batch-transaction";
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
import { rolodexSeedRows } from "./seed";

/**
 * The demo tenant's wipe and reseed as tenant-scoped statements: everything
 * hangs off a person (and connections point at two), so the children go first
 * and the people are inserted before the rows that reference them.
 */
export async function collectRolodexReset(
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
  for (const { table, row } of await rolodexSeedRows(tenantId)) {
    batch.insert(table, row);
  }
}
