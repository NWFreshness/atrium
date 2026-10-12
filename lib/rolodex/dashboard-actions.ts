"use server";

import { sessionTenant } from "../tenancy";
import { type RolodexDashboard } from "./dashboard";

import { getDashboardIn } from "./dashboard-ops";

export async function getDashboardAction(): Promise<RolodexDashboard> {
  return getDashboardIn(await sessionTenant());
}
