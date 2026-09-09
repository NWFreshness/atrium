import Papa from "papaparse";
import VCARD from "vcf";
import {
  createImportantDate,
  createPerson,
  listPeople,
  type RolodexRepository,
} from "./queries";

export type ParsedPerson = {
  name: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  company: string | null;
  city: string | null;
  birthday: string | null;
  notes: string | null;
};

type CsvRow = Record<string, string | undefined>;

export type ImportParseResult = {
  format: "csv" | "vcf";
  headers: string[];
  rows: CsvRow[];
  people: ParsedPerson[];
  suggestedMapping: Record<string, string> | null;
};

export const PERSON_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "jobTitle", label: "Job title" },
  { key: "company", label: "Company" },
  { key: "city", label: "City" },
  { key: "birthday", label: "Birthday" },
  { key: "notes", label: "Notes" },
] as const;

const FIELD_KEYS = PERSON_FIELDS.map((field) => field.key);

const HEADER_SYNONYMS: Record<string, string[]> = {
  name: [
    "name",
    "full name",
    "fullname",
    "fn",
    "display name",
    "given name",
    "first name",
  ],
  email: ["email", "e-mail", "email address", "mail", "emailaddress"],
  phone: [
    "phone",
    "phone number",
    "mobile",
    "cell",
    "tel",
    "telephone",
    "mobile phone",
  ],
  jobTitle: ["job title", "title", "role", "position", "job"],
  company: [
    "company",
    "organization",
    "organisation",
    "organisation name",
    "org",
    "employer",
    "company name",
  ],
  city: ["city", "town", "location", "home city", "address city"],
  birthday: [
    "birthday",
    "birth date",
    "birthdate",
    "bday",
    "dob",
    "date of birth",
  ],
  notes: ["notes", "note", "comment", "comments", "remarks"],
};

export function suggestMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const field of FIELD_KEYS) {
    const synonyms = HEADER_SYNONYMS[field] ?? [field];
    const match = headers.find((header) => {
      const norm = header.trim().toLowerCase();
      return (
        synonyms.some((synonym) => norm === synonym) ||
        norm.includes(field.toLowerCase())
      );
    });
    if (match) {
      mapping[match] = field;
    }
  }
  return mapping;
}

export function parseCSV(text: string): ImportParseResult {
  const parsed = Papa.parse<CsvRow>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  const headers = parsed.meta.fields ?? [];
  const rows = parsed.data.filter((row) =>
    Object.values(row).some((value) => (value ?? "").trim() !== ""),
  );
  return {
    format: "csv",
    headers,
    rows,
    people: [],
    suggestedMapping: suggestMapping(headers),
  };
}

function nameFromParts(row: CsvRow): string | null {
  const first = (row["First Name"] ?? row["first name"] ?? "").trim();
  const last = (row["Last Name"] ?? row["last name"] ?? "").trim();
  return [first, last].filter(Boolean).join(" ") || null;
}

export function normalizeBirthday(
  raw: string | null | undefined,
): string | null {
  if (!raw) {
    return null;
  }
  const value = raw.trim();
  let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    if (first > 12 && second <= 12) {
      return `${match[3]}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`;
    }
    return `${match[3]}-${String(first).padStart(2, "0")}-${String(second).padStart(2, "0")}`;
  }
  match = /^(\d{4})$/.exec(value);
  if (match) {
    return value;
  }
  match = /^--(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    return value;
  }
  return null;
}

export function applyMapping(
  parsed: ImportParseResult,
  mapping: Record<string, string>,
): { people: ParsedPerson[]; skipped: number } {
  const people: ParsedPerson[] = [];
  let skipped = 0;
  for (const row of parsed.rows) {
    const mapped: Record<string, string | null> = {};
    for (const [header, field] of Object.entries(mapping)) {
      mapped[field] = (row[header] ?? "").trim() || null;
    }
    mapped.name ??= nameFromParts(row);
    if (!mapped.name) {
      skipped += 1;
      continue;
    }
    people.push({
      name: mapped.name,
      email: mapped.email ?? null,
      phone: mapped.phone ?? null,
      jobTitle: mapped.jobTitle ?? null,
      company: mapped.company ?? null,
      city: mapped.city ?? null,
      birthday: normalizeBirthday(mapped.birthday),
      notes: mapped.notes ?? null,
    });
  }
  return { people, skipped };
}

function company(org: string | null): string | null {
  return org?.split(";")[0]?.trim() || null;
}

function propValue(
  card: InstanceType<typeof VCARD>,
  propName: string,
): string | null {
  const got = card.get(propName) as
    { valueOf(): unknown } | { valueOf(): unknown }[] | undefined;
  const entry = Array.isArray(got) ? got.at(0) : got;
  if (!entry) {
    return null;
  }
  const value: unknown = entry.valueOf();
  if (Array.isArray(value)) {
    return typeof value[3] === "string" ? value[3].trim() || null : null;
  }
  return typeof value === "string" ? value.trim() || null : null;
}

function fullName(n: string | null): string | null {
  if (!n) {
    return null;
  }
  const parts = n.split(";");
  return (
    [parts[1], parts[2], parts[0]].filter(Boolean).join(" ").trim() || null
  );
}

function cityFromAdr(adr: string | null): string | null {
  return adr?.split(";")[3]?.trim() || null;
}

export function parseVcf(text: string): ParsedPerson[] {
  const normalized = text
    .replace(/\r?\n/g, "\r\n")
    .replace(/^VERSION:4(\.0)?$/gim, "VERSION:3.0");
  let cards: InstanceType<typeof VCARD>[];
  try {
    cards = VCARD.parse(normalized.trim()) as InstanceType<typeof VCARD>[];
  } catch {
    return [];
  }
  const people: ParsedPerson[] = [];
  for (const card of cards) {
    const name = propValue(card, "fn") ?? fullName(propValue(card, "n"));
    if (!name) {
      continue;
    }
    people.push({
      name,
      email: propValue(card, "email"),
      phone: propValue(card, "tel"),
      jobTitle: propValue(card, "title"),
      company: company(propValue(card, "org")),
      city: cityFromAdr(propValue(card, "adr")),
      birthday: normalizeBirthday(propValue(card, "bday")),
      notes: propValue(card, "note"),
    });
  }
  return people;
}

export type DuplicateCheck = {
  isDuplicate: boolean;
  duplicateOfId: string | null;
  duplicateOfName: string | null;
  reason: "email" | "name" | null;
};

function normName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findDuplicates(
  candidate: ParsedPerson,
  existing: { id: string; name: string; email: string | null }[],
): DuplicateCheck {
  if (candidate.email) {
    const email = candidate.email.toLowerCase();
    const hit = existing.find(
      (person) => person.email?.toLowerCase() === email,
    );
    if (hit) {
      return {
        isDuplicate: true,
        duplicateOfId: hit.id,
        duplicateOfName: hit.name,
        reason: "email",
      };
    }
  }
  const name = normName(candidate.name);
  const hit = existing.find((person) => normName(person.name) === name);
  if (hit) {
    return {
      isDuplicate: true,
      duplicateOfId: hit.id,
      duplicateOfName: hit.name,
      reason: "name",
    };
  }
  return {
    isDuplicate: false,
    duplicateOfId: null,
    duplicateOfName: null,
    reason: null,
  };
}

export function birthdayParts(
  raw: string | null,
): { month: number; day: number; year: number | null } | null {
  if (!raw) {
    return null;
  }
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }
  match = /^--(\d{2})-(\d{2})$/.exec(raw);
  if (match) {
    return { year: null, month: Number(match[1]), day: Number(match[2]) };
  }
  return null;
}

function snapshotRepo(repo: RolodexRepository): RolodexRepository {
  return {
    people: [...repo.people],
    interactions: [...repo.interactions],
    importantDates: [...repo.importantDates],
    facts: [...repo.facts],
    news: [...repo.news],
    reminders: [...repo.reminders],
    gifts: [...repo.gifts],
    connections: [...repo.connections],
  };
}

function restoreRepo(
  target: RolodexRepository,
  source: RolodexRepository,
): void {
  target.people.splice(0, target.people.length, ...source.people);
  target.interactions.splice(
    0,
    target.interactions.length,
    ...source.interactions,
  );
  target.importantDates.splice(
    0,
    target.importantDates.length,
    ...source.importantDates,
  );
  target.facts.splice(0, target.facts.length, ...source.facts);
  target.news.splice(0, target.news.length, ...source.news);
  target.reminders.splice(0, target.reminders.length, ...source.reminders);
  target.gifts.splice(0, target.gifts.length, ...source.gifts);
  target.connections.splice(
    0,
    target.connections.length,
    ...source.connections,
  );
}

export async function applyImport(
  tenantId: string,
  people: ParsedPerson[],
  repo?: RolodexRepository,
): Promise<{ imported: number; skippedDuplicate: number }> {
  const snapshot = repo ? snapshotRepo(repo) : null;
  try {
    const existing = (await listPeople(tenantId, repo)).map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email,
    }));
    let imported = 0;
    let skippedDuplicate = 0;
    for (const person of people) {
      if (findDuplicates(person, existing).isDuplicate) {
        skippedDuplicate += 1;
        continue;
      }
      const created = await createPerson(
        tenantId,
        {
          name: person.name,
          email: person.email,
          phone: person.phone,
          jobTitle: person.jobTitle,
          company: person.company,
          city: person.city,
          notes: person.notes,
        },
        repo,
      );
      existing.push({
        id: created.id,
        name: created.name,
        email: created.email,
      });
      const parts = birthdayParts(person.birthday);
      if (parts) {
        await createImportantDate(
          tenantId,
          {
            personId: created.id,
            type: "birthday",
            month: parts.month,
            day: parts.day,
            year: parts.year,
          },
          repo,
        );
      }
      imported += 1;
    }
    return { imported, skippedDuplicate };
  } catch (error) {
    if (snapshot && repo) {
      restoreRepo(repo, snapshot);
    }
    throw error;
  }
}
