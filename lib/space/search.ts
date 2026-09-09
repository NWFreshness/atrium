import { listPages, type Page, type SpaceRepository } from "./queries";
import type { PageType } from "./constants";

export type SearchPageHit = {
  id: string;
  title: string;
  type: PageType;
  icon: string | null;
};

function toHit(page: Page): SearchPageHit {
  return {
    id: page.id,
    title: page.title,
    type: page.type,
    icon: page.icon,
  };
}

function compareTitleThenId(a: SearchPageHit, b: SearchPageHit): number {
  if (a.title !== b.title) {
    return a.title < b.title ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export async function searchPages(
  tenantId: string,
  q: string,
  repo?: SpaceRepository,
): Promise<SearchPageHit[]> {
  const pages = await listPages(tenantId, repo);
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  return pages
    .filter((page) => page.title.toLowerCase().includes(needle))
    .map(toHit)
    .sort(compareTitleThenId);
}
