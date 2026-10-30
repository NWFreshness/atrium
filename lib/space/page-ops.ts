import {
  createPage,
  deletePage,
  getPage,
  listPages,
  updatePage,
  type CreatePageInput,
  type Page,
  type SpaceStore,
} from "./queries";

export async function listPagesIn(
  tenantId: string,
  repo?: SpaceStore,
): Promise<Page[]> {
  return listPages(tenantId, repo);
}

export async function getPageIn(
  tenantId: string,
  id: string,
  repo?: SpaceStore,
): Promise<Page | null> {
  return getPage(tenantId, id, repo);
}

export async function createPageIn(
  tenantId: string,
  input: CreatePageInput,
  repo?: SpaceStore,
): Promise<Page> {
  return createPage(
    tenantId,
    {
      title: input.title,
      type: input.type ?? "page",
      parentId: input.parentId ?? null,
      icon: input.icon ?? null,
    },
    repo,
  );
}

export async function renamePageIn(
  tenantId: string,
  id: string,
  title: string,
  repo?: SpaceStore,
): Promise<Page | null> {
  return updatePage(tenantId, id, { title }, repo);
}

export async function deletePageIn(
  tenantId: string,
  id: string,
  repo?: SpaceStore,
): Promise<Page | null> {
  return deletePage(tenantId, id, repo);
}
