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
  requireDatabase,
  updatePage,
  updateProperty,
  updateRowValue,
  type Page,
  type Property,
  type PropertyOption,
  type RowValue,
  type SpaceStore,
  type View,
} from "./queries";

export type DatabaseSnapshot = {
  database: Page;
  properties: Property[];
  options: PropertyOption[];
  rows: Page[];
  values: RowValue[];
  views: View[];
};

export async function createDatabaseIn(
  tenantId: string,
  input: {
    title?: string;
    parentId?: string | null;
    icon?: string | null;
  } = {},
  repo?: SpaceStore,
): Promise<Page> {
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

export async function getDatabaseSnapshotIn(
  tenantId: string,
  databaseId: string,
  repo?: SpaceStore,
): Promise<DatabaseSnapshot> {
  const database = await requireDatabase(tenantId, databaseId, repo);
  const [properties, rows, values, options, views] = await Promise.all([
    listProperties(tenantId, repo, { databaseId }),
    listPages(tenantId, repo, { parentId: databaseId }),
    listRowValues(tenantId, repo, { databaseId }),
    listPropertyOptions(tenantId, repo, { databaseId }),
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

export async function createPropertyIn(
  tenantId: string,
  input: {
    databaseId: string;
    name: string;
    type: PropertyType;
  },
  repo?: SpaceStore,
): Promise<Property> {
  return createProperty(
    tenantId,
    { databaseId: input.databaseId, name: input.name, type: input.type },
    repo,
  );
}

export async function renamePropertyIn(
  tenantId: string,
  id: string,
  name: string,
  repo?: SpaceStore,
): Promise<Property | null> {
  return updateProperty(tenantId, id, { name }, repo);
}

export async function deletePropertyIn(
  tenantId: string,
  id: string,
  repo?: SpaceStore,
): Promise<Property | null> {
  return deleteProperty(tenantId, id, repo);
}

export async function createPropertyOptionIn(
  tenantId: string,
  input: {
    propertyId: string;
    name: string;
    color: string;
  },
  repo?: SpaceStore,
): Promise<PropertyOption> {
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

export async function createRowIn(
  tenantId: string,
  input: { databaseId: string; title?: string },
  repo?: SpaceStore,
): Promise<Page> {
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

export async function renameRowIn(
  tenantId: string,
  id: string,
  title: string,
  repo?: SpaceStore,
): Promise<Page | null> {
  const page = await getPage(tenantId, id, repo);
  if (!page || page.type !== "row") {
    return null;
  }
  return updatePage(tenantId, id, { title }, repo);
}

export async function deleteRowIn(
  tenantId: string,
  id: string,
  repo?: SpaceStore,
): Promise<Page | null> {
  const page = await getPage(tenantId, id, repo);
  if (!page || page.type !== "row") {
    return null;
  }
  return deletePage(tenantId, id, repo);
}

export async function setRowValueIn(
  tenantId: string,
  input: {
    rowId: string;
    propertyId: string;
    value: unknown;
  },
  repo?: SpaceStore,
): Promise<RowValue | null> {
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
