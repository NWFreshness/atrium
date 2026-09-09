"use server";

import { requireTenant, type GetSession } from "../tenancy";
import type { SpaceRepository } from "./queries";
import { searchPages, type SearchPageHit } from "./search";

export async function searchPagesForSession(
  getSession: GetSession,
  q: string,
  repo?: SpaceRepository,
): Promise<SearchPageHit[]> {
  const { tenantId } = await requireTenant(getSession);
  return searchPages(tenantId, q, repo);
}

export async function searchPagesAction(q: string): Promise<SearchPageHit[]> {
  const { auth } = await import("@/auth");
  return searchPagesForSession(auth, q);
}
