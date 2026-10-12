"use server";

import { sessionTenant } from "../tenancy";
import { type ParsedPerson } from "./import";

import { parseImportIn, previewMappedCsvIn, applyImportIn } from "./import-ops";

export type { ImportPreviewRow } from "./import-ops";

export async function parseImportAction(text: string, filename: string) {
  return parseImportIn(await sessionTenant(), { text, filename });
}

export async function previewMappedCsvAction(
  text: string,
  mapping: Record<string, string>,
) {
  return previewMappedCsvIn(await sessionTenant(), { text, mapping });
}

export async function applyImportAction(people: ParsedPerson[]) {
  return applyImportIn(await sessionTenant(), { people });
}
