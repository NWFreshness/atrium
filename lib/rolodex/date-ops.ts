import { datesInMonth } from "./dates";
import {
  createImportantDate,
  deleteImportantDate,
  getImportantDate,
  listImportantDates,
  listPeople,
  updateImportantDate,
  type CreateImportantDateInput,
  type RolodexStore,
} from "./queries";

export async function listImportantDatesIn(
  tenantId: string,
  input: { personId?: string } = {},
  repo?: RolodexStore,
) {
  return listImportantDates(tenantId, repo, { personId: input.personId });
}

export async function createImportantDateIn(
  tenantId: string,
  input: CreateImportantDateInput,
  repo?: RolodexStore,
) {
  return createImportantDate(tenantId, input, repo);
}

export async function updateImportantDateIn(
  tenantId: string,
  id: string,
  input: Partial<CreateImportantDateInput>,
  repo?: RolodexStore,
) {
  const existing = await getImportantDate(tenantId, id, repo);
  if (!existing) {
    return null;
  }
  return updateImportantDate(tenantId, id, input, repo);
}

export async function deleteImportantDateIn(
  tenantId: string,
  id: string,
  repo?: RolodexStore,
) {
  return deleteImportantDate(tenantId, id, repo);
}

export async function listMonthDatesIn(
  tenantId: string,
  year: number,
  month: number,
  repo?: RolodexStore,
) {
  const [people, dates] = await Promise.all([
    listPeople(tenantId, repo),
    listImportantDates(tenantId, repo),
  ]);
  const names = new Map(people.map((person) => [person.id, person.name]));
  return datesInMonth(
    dates.map((row) => ({
      id: row.id,
      personId: row.personId,
      personName: names.get(row.personId) ?? "",
      type: row.type,
      label: row.label,
      month: row.month,
      day: row.day,
      year: row.year,
    })),
    year,
    month,
  );
}
