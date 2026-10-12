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
import { listPeople, type RolodexStore } from "./queries";

export type ImportPreviewRow = ParsedPerson &
  DuplicateCheck & { selected: boolean };

export async function parseImportIn(
  tenantId: string,
  input: { text: string; filename: string },
  repo?: RolodexStore,
): Promise<{
  format: "csv" | "vcf";
  headers: string[];
  suggestedMapping: Record<string, string> | null;
  people: ImportPreviewRow[];
  skipped: number;
  error: string | null;
}> {
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

export async function previewMappedCsvIn(
  tenantId: string,
  input: {
    text: string;
    mapping: Record<string, string>;
  },
  repo?: RolodexStore,
): Promise<{ people: ImportPreviewRow[]; skipped: number }> {
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

export async function applyImportIn(
  tenantId: string,
  input: { people: ParsedPerson[] },
  repo?: RolodexStore,
) {
  return applyImport(tenantId, input.people, repo);
}
