"use server";

import { requireTenant, type GetSession } from "../tenancy";
import type { PropertyType } from "./constants";
import {
  createPage,
  createProperty,
  createPropertyOption,
  createRowValue,
  deletePage,
  deleteProperty,
  getPage,
  getProperty,
  getRowValue,
  listPages,
  listProperties,
  listPropertyOptions,
  listRowValues,
  listViews,
  updatePage,
  updateProperty,
  updateRowValue,
  type Page,
  type Property,
  type PropertyOption,
  type RowValue,
  type SpaceRepository,
  type View,
} from "./queries";

type ClientTenantInput = {
  tenantId?: string;
};

export type DatabaseSnapshot = {
  database: Page;
  properties: Property[];
  options: PropertyOption[];
  rows: Page[];
  values: RowValue[];
  views: View[];
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

export async function createDatabaseForSession(
  getSession: GetSession,
  input: {
    title?: string;
    parentId?: string | null;
    icon?: string | null;
  } & ClientTenantInput = {},
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
      title: input.title ?? "",
      type: "database",
      parentId: input.parentId ?? null,
      icon: input.icon ?? "📋",
    },
    repo,
  );
}

export async function getDatabaseSnapshotForSession(
  getSession: GetSession,
  databaseId: string,
  input: ClientTenantInput = {},
  repo?: SpaceRepository,
): Promise<DatabaseSnapshot> {
  const { tenantId } = await requireTenant(getSession, input);
  const database = await requireDatabase(tenantId, databaseId, repo);
  const [properties, rows, values, options, views] = await Promise.all([
    listProperties(tenantId, repo, { databaseId }),
    listPages(tenantId, repo, { parentId: databaseId }),
    listRowValues(tenantId, repo),
    listPropertyOptions(tenantId, repo),
    listViews(tenantId, repo, { databaseId }),
  ]);
  const rowPages = rows.filter((page) => page.type === "row");
  const rowIds = new Set(rowPages.map((page) => page.id));
  const propertyIds = new Set(properties.map((property) => property.id));
  return {
    database,
    properties,
    options: options.filter((option) => propertyIds.has(option.propertyId)),
    rows: rowPages,
    values: values.filter(
      (value) => rowIds.has(value.rowId) && propertyIds.has(value.propertyId),
    ),
    views,
  };
}

export async function createPropertyForSession(
  getSession: GetSession,
  input: {
    databaseId: string;
    name: string;
    type: PropertyType;
  } & ClientTenantInput,
  repo?: SpaceRepository,
): Promise<Property> {
  const { tenantId } = await requireTenant(getSession, input);
  await requireDatabase(tenantId, input.databaseId, repo);
  return createProperty(
    tenantId,
    { databaseId: input.databaseId, name: input.name, type: input.type },
    repo,
  );
}

export async function renamePropertyForSession(
  getSession: GetSession,
  id: string,
  name: string,
  input: ClientTenantInput = {},
  repo?: SpaceRepository,
): Promise<Property | null> {
  const { tenantId } = await requireTenant(getSession, input);
  return updateProperty(tenantId, id, { name }, repo);
}

export async function deletePropertyForSession(
  getSession: GetSession,
  id: string,
  repo?: SpaceRepository,
): Promise<Property | null> {
  const { tenantId } = await requireTenant(getSession);
  return deleteProperty(tenantId, id, repo);
}

export async function createPropertyOptionForSession(
  getSession: GetSession,
  input: {
    propertyId: string;
    name: string;
    color: string;
  } & ClientTenantInput,
  repo?: SpaceRepository,
): Promise<PropertyOption> {
  const { tenantId } = await requireTenant(getSession, input);
  const property = await getProperty(tenantId, input.propertyId, repo);
  if (!property) {
    throw new Error("Page not found");
  }
  return createPropertyOption(
    tenantId,
    {
      propertyId: input.propertyId,
      name: input.name,
      color: input.color,
    },
    repo,
  );
}

export async function createRowForSession(
  getSession: GetSession,
  input: { databaseId: string; title?: string } & ClientTenantInput,
  repo?: SpaceRepository,
): Promise<Page> {
  const { tenantId } = await requireTenant(getSession, input);
  await requireDatabase(tenantId, input.databaseId, repo);
  return createPage(
    tenantId,
    {
      title: input.title ?? "",
      type: "row",
      parentId: input.databaseId,
    },
    repo,
  );
}

export async function renameRowForSession(
  getSession: GetSession,
  id: string,
  title: string,
  input: ClientTenantInput = {},
  repo?: SpaceRepository,
): Promise<Page | null> {
  const { tenantId } = await requireTenant(getSession, input);
  const page = await getPage(tenantId, id, repo);
  if (!page || page.type !== "row") {
    return null;
  }
  return updatePage(tenantId, id, { title }, repo);
}

export async function deleteRowForSession(
  getSession: GetSession,
  id: string,
  repo?: SpaceRepository,
): Promise<Page | null> {
  const { tenantId } = await requireTenant(getSession);
  const page = await getPage(tenantId, id, repo);
  if (!page || page.type !== "row") {
    return null;
  }
  return deletePage(tenantId, id, repo);
}

export async function setRowValueForSession(
  getSession: GetSession,
  input: {
    rowId: string;
    propertyId: string;
    value: unknown;
  } & ClientTenantInput,
  repo?: SpaceRepository,
): Promise<RowValue | null> {
  const { tenantId } = await requireTenant(getSession, input);
  const [row, property] = await Promise.all([
    getPage(tenantId, input.rowId, repo),
    getProperty(tenantId, input.propertyId, repo),
  ]);
  if (
    !row ||
    row.type !== "row" ||
    !property ||
    property.databaseId !== row.parentId
  ) {
    return null;
  }
  const existing = await getRowValue(
    tenantId,
    input.rowId,
    input.propertyId,
    repo,
  );
  if (existing) {
    return updateRowValue(
      tenantId,
      input.rowId,
      input.propertyId,
      { value: input.value },
      repo,
    );
  }
  return createRowValue(
    tenantId,
    {
      rowId: input.rowId,
      propertyId: input.propertyId,
      value: input.value,
    },
    repo,
  );
}

export async function createDatabaseAction(
  input: {
    title?: string;
    parentId?: string | null;
  } = {},
): Promise<Page> {
  const { auth } = await import("@/auth");
  return createDatabaseForSession(auth, input);
}

export async function getDatabaseSnapshotAction(
  databaseId: string,
): Promise<DatabaseSnapshot> {
  const { auth } = await import("@/auth");
  return getDatabaseSnapshotForSession(auth, databaseId);
}

export async function createPropertyAction(input: {
  databaseId: string;
  name: string;
  type: PropertyType;
}): Promise<Property> {
  const { auth } = await import("@/auth");
  return createPropertyForSession(auth, input);
}

export async function renamePropertyAction(
  id: string,
  name: string,
): Promise<Property | null> {
  const { auth } = await import("@/auth");
  return renamePropertyForSession(auth, id, name);
}

export async function deletePropertyAction(
  id: string,
): Promise<Property | null> {
  const { auth } = await import("@/auth");
  return deletePropertyForSession(auth, id);
}

export async function createPropertyOptionAction(input: {
  propertyId: string;
  name: string;
  color: string;
}): Promise<PropertyOption> {
  const { auth } = await import("@/auth");
  return createPropertyOptionForSession(auth, input);
}

export async function createRowAction(input: {
  databaseId: string;
  title?: string;
}): Promise<Page> {
  const { auth } = await import("@/auth");
  return createRowForSession(auth, input);
}

export async function renameRowAction(
  id: string,
  title: string,
): Promise<Page | null> {
  const { auth } = await import("@/auth");
  return renameRowForSession(auth, id, title);
}

export async function deleteRowAction(id: string): Promise<Page | null> {
  const { auth } = await import("@/auth");
  return deleteRowForSession(auth, id);
}

export async function setRowValueAction(input: {
  rowId: string;
  propertyId: string;
  value: unknown;
}): Promise<RowValue | null> {
  const { auth } = await import("@/auth");
  return setRowValueForSession(auth, input);
}
