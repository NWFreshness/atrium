"use server";

import { requireTenant, type GetSession } from "../tenancy";
import {
  applyImport,
  applyMapping,
  findDuplicates,
  ImportTooLargeError,
  parseCSV,
  parseVcf,
  type DuplicateCheck,
  type ParsedPerson,
} from "./import";
import { IMPORT_TOO_LARGE, MAX_IMPORT_CHARS } from "./import-limits";
import { listPeople, type RolodexRepository } from "./queries";

type ClientTenantInput = { tenantId?: string };

export type ImportPreviewRow = ParsedPerson &
  DuplicateCheck & { selected: boolean };

export async function parseImportForSession(
  getSession: GetSession,
  input: { text: string; filename: string } & ClientTenantInput,
  repo?: RolodexRepository,
): Promise<{
  format: "csv" | "vcf";
  headers: string[];
  suggestedMapping: Record<string, string> | null;
  people: ImportPreviewRow[];
  skipped: number;
  error: string | null;
}> {
  const { tenantId } = await requireTenant(getSession, input);
  const name = input.filename.toLowerCase();
  if (input.text.length > MAX_IMPORT_CHARS) {
    return {
      format: name.endsWith(".vcf") || name.endsWith(".vcard") ? "vcf" : "csv",
      headers: [],
      suggestedMapping: null,
      people: [],
      skipped: 0,
      error: IMPORT_TOO_LARGE,
    };
  }
  const existing = await listPeople(tenantId, repo);
  try {
    if (name.endsWith(".vcf") || name.endsWith(".vcard")) {
      const people = parseVcf(input.text);
      return {
        format: "vcf",
        headers: [],
        suggestedMapping: null,
        people: people.map((person) => {
          const dup = findDuplicates(person, existing);
          return { ...person, ...dup, selected: !dup.isDuplicate };
        }),
        skipped: 0,
        error: null,
      };
    }
    const parsed = parseCSV(input.text);
    const mapping = parsed.suggestedMapping ?? {};
    const { people, skipped } = applyMapping(parsed, mapping);
    return {
      format: "csv",
      headers: parsed.headers,
      suggestedMapping: mapping,
      people: people.map((person) => {
        const dup = findDuplicates(person, existing);
        return { ...person, ...dup, selected: !dup.isDuplicate };
      }),
      skipped,
      error: null,
    };
  } catch (error) {
    if (error instanceof ImportTooLargeError) {
      return {
        format: name.endsWith(".vcf") ? "vcf" : "csv",
        headers: [],
        suggestedMapping: null,
        people: [],
        skipped: 0,
        error: IMPORT_TOO_LARGE,
      };
    }
    return {
      format: name.endsWith(".vcf") ? "vcf" : "csv",
      headers: [],
      suggestedMapping: null,
      people: [],
      skipped: 0,
      error: "Could not parse that file.",
    };
  }
}

export async function previewMappedCsvForSession(
  getSession: GetSession,
  input: {
    text: string;
    mapping: Record<string, string>;
  } & ClientTenantInput,
  repo?: RolodexRepository,
): Promise<{ people: ImportPreviewRow[]; skipped: number }> {
  const { tenantId } = await requireTenant(getSession, input);
  const existing = await listPeople(tenantId, repo);
  const parsed = parseCSV(input.text);
  const { people, skipped } = applyMapping(parsed, input.mapping);
  return {
    skipped,
    people: people.map((person) => {
      const dup = findDuplicates(person, existing);
      return { ...person, ...dup, selected: !dup.isDuplicate };
    }),
  };
}

export async function applyImportForSession(
  getSession: GetSession,
  input: { people: ParsedPerson[] } & ClientTenantInput,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  return applyImport(tenantId, input.people, repo);
}

export async function parseImportAction(text: string, filename: string) {
  const { auth } = await import("@/auth");
  return parseImportForSession(auth, { text, filename });
}

export async function previewMappedCsvAction(
  text: string,
  mapping: Record<string, string>,
) {
  const { auth } = await import("@/auth");
  return previewMappedCsvForSession(auth, { text, mapping });
}

export async function applyImportAction(people: ParsedPerson[]) {
  const { auth } = await import("@/auth");
  return applyImportForSession(auth, { people });
}
