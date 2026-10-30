"use server";

import { sessionTenant } from "../tenancy";
import { type Dashboard } from "./dashboard";

import { getDashboardIn } from "./dashboard-ops";

export async function getDashboardAction(): Promise<Dashboard> {
  return getDashboardIn(await sessionTenant());
}
