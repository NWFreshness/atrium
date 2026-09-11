import type { WriteOpts } from "../db/batch-transaction";
import { assertText, MAX_LONG_TEXT, MAX_SHORT_TEXT } from "../input/text";
import {
  insertConnection,
  insertFact,
  insertGift,
  insertImportantDate,
  insertInteraction,
  insertNews,
  insertPerson,
  insertReminder,
  deleteConnectionInDrizzle,
  deleteGiftInDrizzle,
  deleteImportantDateInDrizzle,
  deletePersonInDrizzle,
  getImportantDateInDrizzle,
  getPersonInDrizzle,
  getReminderInDrizzle,
  listConnectionsInDrizzle,
  listFactsInDrizzle,
  listGiftsInDrizzle,
  listImportantDatesInDrizzle,
  listInteractionsInDrizzle,
  listNewsInDrizzle,
  listPeopleInDrizzle,
  listRemindersInDrizzle,
  updateImportantDateInDrizzle,
  updatePersonInDrizzle,
  updateReminderInDrizzle,
} from "./queries-drizzle";
import {
  createConnectionInMemory,
  createFactInMemory,
  createGiftInMemory,
  createImportantDateInMemory,
  createInteractionInMemory,
  createNewsInMemory,
  createPersonInMemory,
  createReminderInMemory,
  deleteConnectionInMemory,
  deleteGiftInMemory,
  deleteImportantDateInMemory,
  deletePersonInMemory,
  getImportantDateInMemory,
  getPersonInMemory,
  getReminderInMemory,
  listConnectionsInMemory,
  listFactsInMemory,
  listGiftsInMemory,
  listImportantDatesInMemory,
  listInteractionsInMemory,
  listNewsInMemory,
  listPeopleInMemory,
  listRemindersInMemory,
  updateImportantDateInMemory,
  updatePersonInMemory,
  updateReminderInMemory,
} from "./queries-memory";
import { newId, now, personRow, requireTenantId } from "./queries-shared";
import type {
  Connection,
  CreateConnectionInput,
  CreateFactInput,
  CreateGiftInput,
  CreateImportantDateInput,
  CreateInteractionInput,
  CreateNewsInput,
  CreatePersonInput,
  CreateReminderInput,
  Fact,
  Gift,
  ImportantDate,
  Interaction,
  LatestNews,
  ListByPersonOpts,
  ListPeopleOpts,
  NewsItem,
  Person,
  PersonComputed,
  Reminder,
  RolodexRepository,
  UpdatePersonInput,
} from "./queries-shared";

export type {
  Connection,
  CreateConnectionInput,
  CreateFactInput,
  CreateGiftInput,
  CreateImportantDateInput,
  CreateInteractionInput,
  CreateNewsInput,
  CreatePersonInput,
  CreateReminderInput,
  Fact,
  Gift,
  ImportantDate,
  Interaction,
  LatestNews,
  ListByPersonOpts,
  ListPeopleOpts,
  NewsItem,
  Person,
  PersonComputed,
  Reminder,
  RolodexRepository,
  UpdatePersonInput,
};
export { createMemoryRolodexRepository } from "./queries-memory";

function short(value: unknown) {
  return assertText(value, MAX_SHORT_TEXT);
}

function long(value: unknown) {
  return assertText(value, MAX_LONG_TEXT);
}

function assertPersonText(input: {
  name?: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  city?: string | null;
  timezone?: string | null;
  howMet?: string | null;
  metWhere?: string | null;
  notes?: string | null;
}) {
  if (input.name !== undefined) short(input.name);
  if (input.email !== undefined) short(input.email);
  if (input.phone !== undefined) short(input.phone);
  if (input.jobTitle !== undefined) short(input.jobTitle);
  if (input.company !== undefined) short(input.company);
  if (input.city !== undefined) short(input.city);
  if (input.timezone !== undefined) short(input.timezone);
  if (input.howMet !== undefined) short(input.howMet);
  if (input.metWhere !== undefined) short(input.metWhere);
  if (input.notes !== undefined) long(input.notes);
}

export async function listPeople(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListPeopleOpts,
): Promise<PersonComputed[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listPeopleInMemory(repo, scoped, opts)
    : listPeopleInDrizzle(scoped, opts);
}

export async function getPerson(
  tenantId: string,
  id: string,
  repo?: RolodexRepository,
): Promise<PersonComputed | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? getPersonInMemory(repo, scoped, id)
    : getPersonInDrizzle(scoped, id);
}

export async function createPerson(
  tenantId: string,
  input: CreatePersonInput,
  repo?: RolodexRepository,
  opts?: WriteOpts,
): Promise<Person> {
  const scoped = requireTenantId(tenantId);
  assertPersonText(input);
  const row = personRow(scoped, input);
  if (repo) {
    return createPersonInMemory(repo, row);
  }
  return insertPerson(row, opts);
}

export async function updatePerson(
  tenantId: string,
  id: string,
  input: UpdatePersonInput,
  repo?: RolodexRepository,
): Promise<Person | null> {
  const scoped = requireTenantId(tenantId);
  assertPersonText(input);
  return repo
    ? updatePersonInMemory(repo, scoped, id, input)
    : updatePersonInDrizzle(scoped, id, input);
}

export async function deletePerson(
  tenantId: string,
  id: string,
  repo?: RolodexRepository,
): Promise<boolean> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? deletePersonInMemory(repo, scoped, id)
    : deletePersonInDrizzle(scoped, id);
}

export async function listInteractions(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<Interaction[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listInteractionsInMemory(repo, scoped, opts)
    : listInteractionsInDrizzle(scoped, opts);
}

export async function createInteraction(
  tenantId: string,
  input: CreateInteractionInput,
  repo?: RolodexRepository,
  opts?: WriteOpts,
): Promise<Interaction> {
  const scoped = requireTenantId(tenantId);
  const row: Interaction = {
    id: newId(),
    tenantId: scoped,
    personId: input.personId,
    type: input.type,
    date: input.date,
    notes: input.notes ?? null,
    createdAt: now(),
  };
  if (repo) {
    return createInteractionInMemory(repo, row);
  }
  return insertInteraction(row, opts);
}

export async function listImportantDates(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<ImportantDate[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listImportantDatesInMemory(repo, scoped, opts)
    : listImportantDatesInDrizzle(scoped, opts);
}

export async function createImportantDate(
  tenantId: string,
  input: CreateImportantDateInput,
  repo?: RolodexRepository,
  opts?: WriteOpts,
): Promise<ImportantDate> {
  const scoped = requireTenantId(tenantId);
  const row: ImportantDate = {
    id: newId(),
    tenantId: scoped,
    personId: input.personId,
    type: input.type,
    label: input.label ?? null,
    month: input.month,
    day: input.day,
    year: input.year ?? null,
    createdAt: now(),
  };
  if (repo) {
    return createImportantDateInMemory(repo, row);
  }
  return insertImportantDate(row, opts);
}

export async function getImportantDate(
  tenantId: string,
  id: string,
  repo?: RolodexRepository,
): Promise<ImportantDate | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? getImportantDateInMemory(repo, scoped, id)
    : getImportantDateInDrizzle(scoped, id);
}

export async function updateImportantDate(
  tenantId: string,
  id: string,
  input: Partial<CreateImportantDateInput>,
  repo?: RolodexRepository,
): Promise<ImportantDate | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? updateImportantDateInMemory(repo, scoped, id, input)
    : updateImportantDateInDrizzle(scoped, id, input);
}

export async function deleteImportantDate(
  tenantId: string,
  id: string,
  repo?: RolodexRepository,
): Promise<boolean> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? deleteImportantDateInMemory(repo, scoped, id)
    : deleteImportantDateInDrizzle(scoped, id);
}

export async function listFacts(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<Fact[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listFactsInMemory(repo, scoped, opts)
    : listFactsInDrizzle(scoped, opts);
}

export async function createFact(
  tenantId: string,
  input: CreateFactInput,
  repo?: RolodexRepository,
  opts?: WriteOpts,
): Promise<Fact> {
  const scoped = requireTenantId(tenantId);
  const row: Fact = {
    id: newId(),
    tenantId: scoped,
    personId: input.personId,
    text: input.text,
    createdAt: now(),
  };
  if (repo) {
    return createFactInMemory(repo, row);
  }
  return insertFact(row, opts);
}

export async function listNews(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<NewsItem[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listNewsInMemory(repo, scoped, opts)
    : listNewsInDrizzle(scoped, opts);
}

export async function createNews(
  tenantId: string,
  input: CreateNewsInput,
  repo?: RolodexRepository,
  opts?: WriteOpts,
): Promise<NewsItem> {
  const scoped = requireTenantId(tenantId);
  const row: NewsItem = {
    id: newId(),
    tenantId: scoped,
    personId: input.personId,
    text: input.text,
    date: input.date,
    createdAt: now(),
  };
  if (repo) {
    return createNewsInMemory(repo, row);
  }
  return insertNews(row, opts);
}

export async function listReminders(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<Reminder[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listRemindersInMemory(repo, scoped, opts)
    : listRemindersInDrizzle(scoped, opts);
}

export async function createReminder(
  tenantId: string,
  input: CreateReminderInput,
  repo?: RolodexRepository,
  opts?: WriteOpts,
): Promise<Reminder> {
  const scoped = requireTenantId(tenantId);
  const row: Reminder = {
    id: newId(),
    tenantId: scoped,
    personId: input.personId,
    text: input.text,
    dueDate: input.dueDate,
    done: input.done ?? false,
    doneAt: input.doneAt ?? null,
    createdAt: now(),
  };
  if (repo) {
    return createReminderInMemory(repo, row);
  }
  return insertReminder(row, opts);
}

export async function getReminder(
  tenantId: string,
  id: string,
  repo?: RolodexRepository,
): Promise<Reminder | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? getReminderInMemory(repo, scoped, id)
    : getReminderInDrizzle(scoped, id);
}

export async function updateReminder(
  tenantId: string,
  id: string,
  input: { done?: boolean; doneAt?: string | null; text?: string },
  repo?: RolodexRepository,
): Promise<Reminder | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? updateReminderInMemory(repo, scoped, id, input)
    : updateReminderInDrizzle(scoped, id, input);
}

export async function listGifts(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<Gift[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listGiftsInMemory(repo, scoped, opts)
    : listGiftsInDrizzle(scoped, opts);
}

export async function createGift(
  tenantId: string,
  input: CreateGiftInput,
  repo?: RolodexRepository,
  opts?: WriteOpts,
): Promise<Gift> {
  const scoped = requireTenantId(tenantId);
  const row: Gift = {
    id: newId(),
    tenantId: scoped,
    personId: input.personId,
    name: input.name,
    kind: input.kind,
    occasion: input.occasion ?? null,
    date: input.date,
    createdAt: now(),
  };
  if (repo) {
    return createGiftInMemory(repo, row);
  }
  return insertGift(row, opts);
}

export async function deleteGift(
  tenantId: string,
  id: string,
  repo?: RolodexRepository,
): Promise<boolean> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? deleteGiftInMemory(repo, scoped, id)
    : deleteGiftInDrizzle(scoped, id);
}

export async function listConnections(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: { personId?: string },
): Promise<Connection[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listConnectionsInMemory(repo, scoped, opts)
    : listConnectionsInDrizzle(scoped, opts);
}

export async function createConnection(
  tenantId: string,
  input: CreateConnectionInput,
  repo?: RolodexRepository,
  opts?: WriteOpts,
): Promise<Connection> {
  const scoped = requireTenantId(tenantId);
  const row: Connection = {
    id: newId(),
    tenantId: scoped,
    personA: input.personA,
    personB: input.personB,
    kind: input.kind,
    aIsParent: input.aIsParent ?? false,
    label: input.label ?? null,
    inverseLabel: input.inverseLabel ?? null,
    note: input.note ?? null,
    createdAt: now(),
  };
  if (repo) {
    return createConnectionInMemory(repo, row);
  }
  return insertConnection(row, opts);
}

export async function deleteConnection(
  tenantId: string,
  id: string,
  repo?: RolodexRepository,
): Promise<boolean> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? deleteConnectionInMemory(repo, scoped, id)
    : deleteConnectionInDrizzle(scoped, id);
}
