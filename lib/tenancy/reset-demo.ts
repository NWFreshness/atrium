import { createBatchRunner, type WriteBatch } from "../db/batch-transaction";
import { getDb } from "../db";
import { requireTenant, type GetSession } from "./index";

/** Collects one app's wipe and reseed for a tenant into the shared batch. */
export type DemoResetter = (
  batch: WriteBatch,
  tenantId: string,
) => Promise<void>;

export type RunBatch = (
  work: (batch: WriteBatch) => Promise<void>,
) => Promise<void>;

/**
 * Production reset: each resetter collects the statements it would write into
 * one `WriteBatch`, which is then sent to Neon as a single transaction. A
 * failure anywhere — a wipe, an insert, the seed itself — rolls the whole thing
 * back, so the demo tenant cannot end up half-wiped.
 *
 * The database is resolved lazily, so a reset that collects nothing never
 * opens a connection.
 */
const defaultRun: RunBatch = createBatchRunner(getDb);

/**
 * Resets the signed-in demo tenant. The resetters are passed in, never
 * registered by import: a caller that forgets one fails to compile its intent
 * rather than silently resetting nothing. The tenant is the session's.
 */
export async function resetDemo(
  getSession: GetSession,
  resetters: readonly DemoResetter[],
  run: RunBatch = defaultRun,
): Promise<void> {
  const { role, tenantId } = await requireTenant(getSession);
  if (role !== "demo") {
    throw new Error("Forbidden");
  }

  await run(async (batch) => {
    for (const reset of resetters) {
      await reset(batch, tenantId);
    }
  });
}
