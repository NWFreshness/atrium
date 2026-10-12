import { getDashboard, type RolodexDashboard } from "./dashboard";
import { todayISO } from "./dates";
import type { RolodexStore } from "./queries";

export async function getDashboardIn(
  tenantId: string,
  repo?: RolodexStore,
  today?: string,
): Promise<RolodexDashboard> {
  return getDashboard(tenantId, repo, today ?? todayISO());
}
