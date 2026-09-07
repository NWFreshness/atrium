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

async function defaultRunInTransaction(
  work: (tx: unknown) => Promise<void>,
): Promise<void> {
  await work(undefined);
}

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
