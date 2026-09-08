"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { getDashboard, type Dashboard } from "./dashboard";
import type { CrmRepository } from "./queries";

type ClientTenantInput = {
  tenantId?: string;
};

export async function getDashboardForSession(
  getSession: GetSession,
  input: ClientTenantInput = {},
  repo?: CrmRepository,
  now?: Date,
): Promise<Dashboard> {
  const { tenantId } = await requireTenant(getSession, input);
  return getDashboard(tenantId, repo, now);
}

export async function getDashboardAction(): Promise<Dashboard> {
  const { auth } = await import("@/auth");
  return getDashboardForSession(auth);
}
