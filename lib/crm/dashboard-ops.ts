import { getDashboard, type Dashboard } from "./dashboard";
import type { CrmStore } from "./queries";

export async function getDashboardIn(
  tenantId: string,
  repo?: CrmStore,
  now?: Date,
): Promise<Dashboard> {
  return getDashboard(tenantId, repo, now);
}
