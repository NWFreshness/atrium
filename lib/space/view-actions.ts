"use server";

import { sessionTenant } from "../tenancy";
import type { ViewKind } from "./constants";
import { type Page, type RowValue, type View } from "./queries";
import type { ViewConfig } from "./view-logic";

import {
  getViewsIn,
  upsertViewIn,
  moveCardIn,
  reorderRowsIn,
} from "./view-ops";

export async function getViewsAction(databaseId: string): Promise<View[]> {
  return getViewsIn(await sessionTenant(), databaseId);
}

export async function upsertViewAction(input: {
  databaseId: string;
  kind: ViewKind;
  config: ViewConfig | Record<string, unknown>;
}): Promise<View> {
  return upsertViewIn(await sessionTenant(), input);
}

export async function moveCardAction(input: {
  rowId: string;
  propertyId: string;
  optionId: string | null;
}): Promise<RowValue | null> {
  return moveCardIn(await sessionTenant(), input);
}

export async function reorderRowsAction(
  databaseId: string,
  orderedIds: string[],
): Promise<Page[] | null> {
  return reorderRowsIn(await sessionTenant(), databaseId, orderedIds);
}
