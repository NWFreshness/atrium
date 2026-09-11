import { createBatchRunner } from "../db/batch-transaction";
import { getDb } from "../db";
import { requireTenant, type GetSession } from "./index";

export type DemoResetter = (tx: unknown, tenantId: string) => Promise<void>;

export type RunInTransaction = (
  work: (tx: unknown) => Promise<void>,
) => Promise<void>;

export type ResetDemoExtra = {
  tenantId?: string;
  runInTransaction?: RunInTransaction;
};

const resetters: DemoResetter[] = [];

export function registerDemoResetter(resetter: DemoResetter): void {
  resetters.push(resetter);
}

export function clearDemoResetters(): void {
  resetters.length = 0;
}

/**
 * Production reset: each resetter collects the statements it would write into
 * one `WriteBatch`, which is then sent to Neon as a single transaction. A
 * failure anywhere — a wipe, an insert, the seed itself — rolls the whole thing
 * back, so the demo tenant cannot end up half-wiped.
 *
 * The database is resolved lazily, so a reset that collects nothing (an empty
 * registry, or the memory path tests use) never opens a connection.
 */
const defaultRunInTransaction: RunInTransaction = createBatchRunner(getDb);

export async function resetDemo(
  getSession: GetSession,
  extra?: ResetDemoExtra,
): Promise<void> {
  const { role, tenantId } = await requireTenant(getSession, extra);
  if (role !== "demo") {
    throw new Error("Forbidden");
  }

  const runInTransaction = extra?.runInTransaction ?? defaultRunInTransaction;
  await runInTransaction(async (tx) => {
    for (const reset of resetters) {
      await reset(tx, tenantId);
    }
  });
}
