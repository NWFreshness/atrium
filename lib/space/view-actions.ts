"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { setRowValueForSession } from "./database-actions";
import type { ViewKind } from "./constants";
import {
  createView,
  getPage,
  getView,
  listPages,
  listViews,
  updatePage,
  updateView,
  type Page,
  type RowValue,
  type SpaceRepository,
  type View,
} from "./queries";
import type { ViewConfig } from "./view-logic";

type ClientTenantInput = {
  tenantId?: string;
};

async function requireDatabase(
  tenantId: string,
  databaseId: string,
  repo?: SpaceRepository,
): Promise<Page> {
  const page = await getPage(tenantId, databaseId, repo);
  if (!page || page.type !== "database") {
    throw new Error("Page not found");
  }
  return page;
}

export async function getViewsForSession(
  getSession: GetSession,
  databaseId: string,
  input: ClientTenantInput = {},
  repo?: SpaceRepository,
): Promise<View[]> {
  const { tenantId } = await requireTenant(getSession, input);
  await requireDatabase(tenantId, databaseId, repo);
  return listViews(tenantId, repo, { databaseId });
}

export async function upsertViewForSession(
  getSession: GetSession,
  input: {
    databaseId: string;
    kind: ViewKind;
    config: ViewConfig | Record<string, unknown>;
  } & ClientTenantInput,
  repo?: SpaceRepository,
): Promise<View> {
  const { tenantId } = await requireTenant(getSession, input);
  await requireDatabase(tenantId, input.databaseId, repo);
  const config = input.config as Record<string, unknown>;
  const existing = await getView(tenantId, input.databaseId, input.kind, repo);
  if (existing) {
    const updated = await updateView(
      tenantId,
      input.databaseId,
      input.kind,
      { config },
      repo,
    );
    return updated!;
  }
  return createView(
    tenantId,
    { databaseId: input.databaseId, kind: input.kind, config },
    repo,
  );
}

export async function moveCardForSession(
  getSession: GetSession,
  input: {
    rowId: string;
    propertyId: string;
    optionId: string | null;
  } & ClientTenantInput,
  repo?: SpaceRepository,
): Promise<RowValue | null> {
  return setRowValueForSession(
    getSession,
    {
      rowId: input.rowId,
      propertyId: input.propertyId,
      value: input.optionId,
      tenantId: input.tenantId,
    },
    repo,
  );
}

export async function reorderRowsForSession(
  getSession: GetSession,
  databaseId: string,
  orderedIds: string[],
  input: ClientTenantInput = {},
  repo?: SpaceRepository,
): Promise<Page[] | null> {
  const { tenantId } = await requireTenant(getSession, input);
  await requireDatabase(tenantId, databaseId, repo);
  const current = (
    await listPages(tenantId, repo, { parentId: databaseId })
  ).filter((page) => page.type === "row");
  const currentIds = [...current.map((page) => page.id)].sort();
  const nextIds = [...orderedIds].sort();
  if (
    currentIds.length !== nextIds.length ||
    currentIds.some((id, index) => id !== nextIds[index])
  ) {
    return null;
  }
  for (let position = 0; position < orderedIds.length; position += 1) {
    const id = orderedIds[position]!;
    await updatePage(tenantId, id, { position }, repo);
  }
  return (await listPages(tenantId, repo, { parentId: databaseId })).filter(
    (page) => page.type === "row",
  );
}

export async function getViewsAction(databaseId: string): Promise<View[]> {
  const { auth } = await import("@/auth");
  return getViewsForSession(auth, databaseId);
}

export async function upsertViewAction(input: {
  databaseId: string;
  kind: ViewKind;
  config: ViewConfig | Record<string, unknown>;
}): Promise<View> {
  const { auth } = await import("@/auth");
  return upsertViewForSession(auth, input);
}

export async function moveCardAction(input: {
  rowId: string;
  propertyId: string;
  optionId: string | null;
}): Promise<RowValue | null> {
  const { auth } = await import("@/auth");
  return moveCardForSession(auth, input);
}

export async function reorderRowsAction(
  databaseId: string,
  orderedIds: string[],
): Promise<Page[] | null> {
  const { auth } = await import("@/auth");
  return reorderRowsForSession(auth, databaseId, orderedIds);
}
