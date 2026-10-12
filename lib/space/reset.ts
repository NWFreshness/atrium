import type { WriteBatch } from "../db/batch-transaction";
import {
  blocks,
  pages,
  properties,
  propertyOptions,
  rowValues,
  views,
} from "./schema";
import { spaceSeedRows } from "./seed";

/**
 * The demo tenant's wipe and reseed as tenant-scoped statements: views point at
 * pages and rows point at properties, so children are deleted first and the
 * pages go back in before the rows that hang off them.
 */
export async function collectSpaceReset(
  batch: WriteBatch,
  tenantId: string,
): Promise<void> {
  batch.deleteTenantRows(views, tenantId);
  batch.deleteTenantRows(rowValues, tenantId);
  batch.deleteTenantRows(propertyOptions, tenantId);
  batch.deleteTenantRows(properties, tenantId);
  batch.deleteTenantRows(blocks, tenantId);
  batch.deleteTenantRows(pages, tenantId);
  for (const { table, row } of await spaceSeedRows(tenantId)) {
    batch.insert(table, row);
  }
}
