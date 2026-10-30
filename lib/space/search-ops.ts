import type { SpaceStore } from "./queries";
import { searchPages, type SearchPageHit } from "./search";

export async function searchPagesIn(
  tenantId: string,
  q: string,
  repo?: SpaceStore,
): Promise<SearchPageHit[]> {
  return searchPages(tenantId, q, repo);
}
