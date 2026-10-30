"use server";

import { sessionTenant } from "../tenancy";
import { type CreateImportantDateInput } from "./queries";

import {
  listImportantDatesIn,
  createImportantDateIn,
  updateImportantDateIn,
  deleteImportantDateIn,
  listMonthDatesIn,
} from "./date-ops";

export async function listImportantDatesAction(personId?: string) {
  return listImportantDatesIn(await sessionTenant(), { personId });
}

export async function createImportantDateAction(
  input: CreateImportantDateInput,
) {
  return createImportantDateIn(await sessionTenant(), input);
}

export async function updateImportantDateAction(
  id: string,
  input: Partial<CreateImportantDateInput>,
) {
  return updateImportantDateIn(await sessionTenant(), id, input);
}

export async function deleteImportantDateAction(id: string) {
  return deleteImportantDateIn(await sessionTenant(), id);
}

export async function listMonthDatesAction(year: number, month: number) {
  return listMonthDatesIn(await sessionTenant(), year, month);
}
