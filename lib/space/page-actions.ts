"use server";

import { requireTenant, type GetSession } from "../tenancy";
import {
  createPage,
  deletePage,
  getPage,
  listPages,
  updatePage,
  type CreatePageInput,
  type Page,
  type SpaceRepository,
} from "./queries";

type ClientTenantInput = {
  tenantId?: string;
};

export async function listPagesForSession(
  getSession: GetSession,
  input: ClientTenantInput = {},
  repo?: SpaceRepository,
): Promise<Page[]> {
  const { tenantId } = await requireTenant(getSession, input);
  return listPages(tenantId, repo);
}

export async function getPageForSession(
  getSession: GetSession,
  id: string,
  repo?: SpaceRepository,
): Promise<Page | null> {
  const { tenantId } = await requireTenant(getSession);
  return getPage(tenantId, id, repo);
}

export async function createPageForSession(
  getSession: GetSession,
  input: CreatePageInput & ClientTenantInput,
  repo?: SpaceRepository,
): Promise<Page> {
  const { tenantId } = await requireTenant(getSession, input);
  if (input.parentId) {
    const parent = await getPage(tenantId, input.parentId, repo);
    if (!parent) {
      throw new Error("Page not found");
    }
  }
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

export async function renamePageForSession(
  getSession: GetSession,
  id: string,
  title: string,
  input: ClientTenantInput = {},
  repo?: SpaceRepository,
): Promise<Page | null> {
  const { tenantId } = await requireTenant(getSession, input);
  return updatePage(tenantId, id, { title }, repo);
}

export async function deletePageForSession(
  getSession: GetSession,
  id: string,
  repo?: SpaceRepository,
): Promise<Page | null> {
  const { tenantId } = await requireTenant(getSession);
  return deletePage(tenantId, id, repo);
}

export async function listPagesAction(): Promise<Page[]> {
  const { auth } = await import("@/auth");
  return listPagesForSession(auth);
}

export async function getPageAction(id: string): Promise<Page | null> {
  const { auth } = await import("@/auth");
  return getPageForSession(auth, id);
}

export async function createPageAction(input: CreatePageInput): Promise<Page> {
  const { auth } = await import("@/auth");
  return createPageForSession(auth, input);
}

export async function renamePageAction(
  id: string,
  title: string,
): Promise<Page | null> {
  const { auth } = await import("@/auth");
  return renamePageForSession(auth, id, title);
}

export async function deletePageAction(id: string): Promise<Page | null> {
  const { auth } = await import("@/auth");
  return deletePageForSession(auth, id);
}
