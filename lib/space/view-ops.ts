import type { ViewKind } from "./constants";
import { setRowValueIn } from "./database-ops";
import {
  createView,
  getView,
  listViews,
  reorderRows,
  requireDatabase,
  updateView,
  type Page,
  type RowValue,
  type SpaceStore,
  type View,
} from "./queries";
import type { ViewConfig } from "./view-logic";

export async function getViewsIn(
  tenantId: string,
  databaseId: string,
  repo?: SpaceStore,
): Promise<View[]> {
  await requireDatabase(tenantId, databaseId, repo);
  return listViews(tenantId, repo, { databaseId });
}

export async function upsertViewIn(
  tenantId: string,
  input: {
    databaseId: string;
    kind: ViewKind;
    config: ViewConfig | Record<string, unknown>;
  },
  repo?: SpaceStore,
): Promise<View> {
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

export async function moveCardIn(
  tenantId: string,
  input: {
    rowId: string;
    propertyId: string;
    optionId: string | null;
  },
  repo?: SpaceStore,
): Promise<RowValue | null> {
  return setRowValueIn(
    tenantId,
    {
      rowId: input.rowId,
      propertyId: input.propertyId,
      value: input.optionId,
    },
    repo,
  );
}

export async function reorderRowsIn(
  tenantId: string,
  databaseId: string,
  orderedIds: string[],
  repo?: SpaceStore,
): Promise<Page[] | null> {
  await requireDatabase(tenantId, databaseId, repo);
  return reorderRows(tenantId, databaseId, orderedIds, repo);
}
