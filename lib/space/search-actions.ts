"use server";

import { sessionTenant } from "../tenancy";
import { type SearchPageHit } from "./search";

import { searchPagesIn } from "./search-ops";

export async function searchPagesAction(q: string): Promise<SearchPageHit[]> {
  return searchPagesIn(await sessionTenant(), q);
}
