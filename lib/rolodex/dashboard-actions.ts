"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { getDashboard, type RolodexDashboard } from "./dashboard";
import { todayISO } from "./dates";
import type { RolodexRepository } from "./queries";

type ClientTenantInput = { tenantId?: string };

export async function getDashboardForSession(
  getSession: GetSession,
  input: ClientTenantInput = {},
  repo?: RolodexRepository,
  today?: string,
): Promise<RolodexDashboard> {
  const { tenantId } = await requireTenant(getSession, input);
  return getDashboard(tenantId, repo, today ?? todayISO());
}

export async function getDashboardAction(): Promise<RolodexDashboard> {
  const { auth } = await import("@/auth");
  return getDashboardForSession(auth);
}
