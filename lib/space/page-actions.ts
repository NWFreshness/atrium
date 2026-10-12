"use server";

import { sessionTenant } from "../tenancy";
import { type CreatePageInput, type Page } from "./queries";

import {
  listPagesIn,
  getPageIn,
  createPageIn,
  renamePageIn,
  deletePageIn,
} from "./page-ops";

export async function listPagesAction(): Promise<Page[]> {
  return listPagesIn(await sessionTenant());
}

export async function getPageAction(id: string): Promise<Page | null> {
  return getPageIn(await sessionTenant(), id);
}

export async function createPageAction(input: CreatePageInput): Promise<Page> {
  return createPageIn(await sessionTenant(), input);
}

export async function renamePageAction(
  id: string,
  title: string,
): Promise<Page | null> {
  return renamePageIn(await sessionTenant(), id, title);
}

export async function deletePageAction(id: string): Promise<Page | null> {
  return deletePageIn(await sessionTenant(), id);
}
