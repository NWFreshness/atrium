"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { DATE_TYPES, type ImportantDateType } from "./constants";
import { datesInMonth } from "./dates";
import {
  createImportantDate,
  deleteImportantDate,
  getImportantDate,
  getPerson,
  listImportantDates,
  listPeople,
  updateImportantDate,
  type CreateImportantDateInput,
  type RolodexRepository,
} from "./queries";

type ClientTenantInput = { tenantId?: string };

function isDateType(value: unknown): value is ImportantDateType {
  return (
    typeof value === "string" &&
    (DATE_TYPES as readonly string[]).includes(value)
  );
}

async function requireSessionPerson(
  tenantId: string,
  personId: string,
  repo?: RolodexRepository,
) {
  return (await getPerson(tenantId, personId, repo)) !== null;
}

export async function listImportantDatesForSession(
  getSession: GetSession,
  input: { personId?: string } & ClientTenantInput = {},
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  return listImportantDates(tenantId, repo, { personId: input.personId });
}

export async function createImportantDateForSession(
  getSession: GetSession,
  input: CreateImportantDateInput & ClientTenantInput,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  if (!isDateType(input.type)) {
    throw new Error("Invalid date type");
  }
  if (!(await requireSessionPerson(tenantId, input.personId, repo))) {
    throw new Error("Person not found");
  }
  return createImportantDate(tenantId, input, repo);
}

export async function updateImportantDateForSession(
  getSession: GetSession,
  id: string,
  input: Partial<CreateImportantDateInput> & ClientTenantInput,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  const existing = await getImportantDate(tenantId, id, repo);
  if (!existing) {
    return null;
  }
  return updateImportantDate(tenantId, id, input, repo);
}

export async function deleteImportantDateForSession(
  getSession: GetSession,
  id: string,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession);
  return deleteImportantDate(tenantId, id, repo);
}

export async function listMonthDatesForSession(
  getSession: GetSession,
  year: number,
  month: number,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession);
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

export async function listImportantDatesAction(personId?: string) {
  const { auth } = await import("@/auth");
  return listImportantDatesForSession(auth, { personId });
}

export async function createImportantDateAction(
  input: CreateImportantDateInput,
) {
  const { auth } = await import("@/auth");
  return createImportantDateForSession(auth, input);
}

export async function updateImportantDateAction(
  id: string,
  input: Partial<CreateImportantDateInput>,
) {
  const { auth } = await import("@/auth");
  return updateImportantDateForSession(auth, id, input);
}

export async function deleteImportantDateAction(id: string) {
  const { auth } = await import("@/auth");
  return deleteImportantDateForSession(auth, id);
}

export async function listMonthDatesAction(year: number, month: number) {
  const { auth } = await import("@/auth");
  return listMonthDatesForSession(auth, year, month);
}
