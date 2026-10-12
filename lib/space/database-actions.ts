"use server";

import { sessionTenant } from "../tenancy";
import type { PropertyType } from "./constants";
import {
  type Page,
  type Property,
  type PropertyOption,
  type RowValue,
} from "./queries";

import {
  type DatabaseSnapshot,
  createDatabaseIn,
  getDatabaseSnapshotIn,
  createPropertyIn,
  renamePropertyIn,
  deletePropertyIn,
  createPropertyOptionIn,
  createRowIn,
  renameRowIn,
  deleteRowIn,
  setRowValueIn,
} from "./database-ops";

export type { DatabaseSnapshot } from "./database-ops";

export async function createDatabaseAction(
  input: {
    title?: string;
    parentId?: string | null;
  } = {},
): Promise<Page> {
  return createDatabaseIn(await sessionTenant(), input);
}

export async function getDatabaseSnapshotAction(
  databaseId: string,
): Promise<DatabaseSnapshot> {
  return getDatabaseSnapshotIn(await sessionTenant(), databaseId);
}

export async function createPropertyAction(input: {
  databaseId: string;
  name: string;
  type: PropertyType;
}): Promise<Property> {
  return createPropertyIn(await sessionTenant(), input);
}

export async function renamePropertyAction(
  id: string,
  name: string,
): Promise<Property | null> {
  return renamePropertyIn(await sessionTenant(), id, name);
}

export async function deletePropertyAction(
  id: string,
): Promise<Property | null> {
  return deletePropertyIn(await sessionTenant(), id);
}

export async function createPropertyOptionAction(input: {
  propertyId: string;
  name: string;
  color: string;
}): Promise<PropertyOption> {
  return createPropertyOptionIn(await sessionTenant(), input);
}

export async function createRowAction(input: {
  databaseId: string;
  title?: string;
}): Promise<Page> {
  return createRowIn(await sessionTenant(), input);
}

export async function renameRowAction(
  id: string,
  title: string,
): Promise<Page | null> {
  return renameRowIn(await sessionTenant(), id, title);
}

export async function deleteRowAction(id: string): Promise<Page | null> {
  return deleteRowIn(await sessionTenant(), id);
}

export async function setRowValueAction(input: {
  rowId: string;
  propertyId: string;
  value: unknown;
}): Promise<RowValue | null> {
  return setRowValueIn(await sessionTenant(), input);
}
