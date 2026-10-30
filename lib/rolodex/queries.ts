import { assertOneOf, InputError } from "../input/result";
import {
  CONNECTION_KINDS,
  DATE_TYPES,
  GIFT_KINDS,
  INTERACTION_TYPES,
} from "./constants";
import { assertText, MAX_LONG_TEXT, MAX_SHORT_TEXT } from "../input/text";
import { getDb } from "../db";
import { createDrizzleRolodexStore, type RolodexStore } from "./store";
import { newId, now, personRow } from "./queries-shared";
import { requireTenantId } from "../tenancy";
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
  UpdatePersonInput,
};
export { createMemoryRolodexRepository } from "./queries-memory";
export type { RolodexRepository } from "./queries-shared";
export { createMemoryRolodexStore, type RolodexStore } from "./store";

/** Production storage. Resolved per call so a test that injects a store never opens a database. */
function defaultStore(): RolodexStore {
  if (!process.env.DATABASE_URL) {
    throw new Error("Rolodex store required");
  }
  return createDrizzleRolodexStore(getDb());
}

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
  store: RolodexStore = defaultStore(),
  opts?: ListPeopleOpts,
): Promise<PersonComputed[]> {
  const scoped = requireTenantId(tenantId);
  return store.people.list(scoped, opts);
}

export async function getPerson(
  tenantId: string,
  id: string,
  store: RolodexStore = defaultStore(),
): Promise<PersonComputed | null> {
  const scoped = requireTenantId(tenantId);
  return store.people.get(scoped, id);
}

export async function createPerson(
  tenantId: string,
  input: CreatePersonInput,
  store: RolodexStore = defaultStore(),
): Promise<Person> {
  const scoped = requireTenantId(tenantId);
  assertPersonText(input);
  const row = personRow(scoped, input);
  return store.people.insert(row);
}

export async function updatePerson(
  tenantId: string,
  id: string,
  input: UpdatePersonInput,
  store: RolodexStore = defaultStore(),
): Promise<Person | null> {
  const scoped = requireTenantId(tenantId);
  assertPersonText(input);
  return store.people.update(scoped, id, input);
}

export async function deletePerson(
  tenantId: string,
  id: string,
  store: RolodexStore = defaultStore(),
): Promise<boolean> {
  const scoped = requireTenantId(tenantId);
  return store.people.delete(scoped, id);
}

async function assertPerson(
  tenantId: string,
  field: string,
  personId: string,
  store: RolodexStore = defaultStore(),
): Promise<void> {
  if (!(await getPerson(tenantId, personId, store))) {
    throw new InputError(field, "Person not found");
  }
}

export async function listInteractions(
  tenantId: string,
  store: RolodexStore = defaultStore(),
  opts?: ListByPersonOpts,
): Promise<Interaction[]> {
  const scoped = requireTenantId(tenantId);
  return store.interactions.list(scoped, opts);
}

export async function createInteraction(
  tenantId: string,
  input: CreateInteractionInput,
  store: RolodexStore = defaultStore(),
): Promise<Interaction> {
  const scoped = requireTenantId(tenantId);
  assertOneOf(
    INTERACTION_TYPES,
    input.type,
    "type",
    "Invalid interaction type",
  );
  await assertPerson(scoped, "personId", input.personId, store);
  const row: Interaction = {
    id: newId(),
    tenantId: scoped,
    personId: input.personId,
    type: input.type,
    date: input.date,
    notes: input.notes ?? null,
    createdAt: now(),
  };
  return store.interactions.insert(row);
}

export async function listImportantDates(
  tenantId: string,
  store: RolodexStore = defaultStore(),
  opts?: ListByPersonOpts,
): Promise<ImportantDate[]> {
  const scoped = requireTenantId(tenantId);
  return store.importantDates.list(scoped, opts);
}

export async function createImportantDate(
  tenantId: string,
  input: CreateImportantDateInput,
  store: RolodexStore = defaultStore(),
): Promise<ImportantDate> {
  const scoped = requireTenantId(tenantId);
  assertOneOf(DATE_TYPES, input.type, "type", "Invalid date type");
  await assertPerson(scoped, "personId", input.personId, store);
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
  return store.importantDates.insert(row);
}

export async function getImportantDate(
  tenantId: string,
  id: string,
  store: RolodexStore = defaultStore(),
): Promise<ImportantDate | null> {
  const scoped = requireTenantId(tenantId);
  return store.importantDates.get(scoped, id);
}

export async function updateImportantDate(
  tenantId: string,
  id: string,
  input: Partial<CreateImportantDateInput>,
  store: RolodexStore = defaultStore(),
): Promise<ImportantDate | null> {
  const scoped = requireTenantId(tenantId);
  return store.importantDates.update(scoped, id, input);
}

export async function deleteImportantDate(
  tenantId: string,
  id: string,
  store: RolodexStore = defaultStore(),
): Promise<boolean> {
  const scoped = requireTenantId(tenantId);
  return store.importantDates.delete(scoped, id);
}

export async function listFacts(
  tenantId: string,
  store: RolodexStore = defaultStore(),
  opts?: ListByPersonOpts,
): Promise<Fact[]> {
  const scoped = requireTenantId(tenantId);
  return store.facts.list(scoped, opts);
}

export async function createFact(
  tenantId: string,
  input: CreateFactInput,
  store: RolodexStore = defaultStore(),
): Promise<Fact> {
  const scoped = requireTenantId(tenantId);
  await assertPerson(scoped, "personId", input.personId, store);
  const row: Fact = {
    id: newId(),
    tenantId: scoped,
    personId: input.personId,
    text: input.text,
    createdAt: now(),
  };
  return store.facts.insert(row);
}

export async function listNews(
  tenantId: string,
  store: RolodexStore = defaultStore(),
  opts?: ListByPersonOpts,
): Promise<NewsItem[]> {
  const scoped = requireTenantId(tenantId);
  return store.news.list(scoped, opts);
}

export async function createNews(
  tenantId: string,
  input: CreateNewsInput,
  store: RolodexStore = defaultStore(),
): Promise<NewsItem> {
  const scoped = requireTenantId(tenantId);
  await assertPerson(scoped, "personId", input.personId, store);
  const row: NewsItem = {
    id: newId(),
    tenantId: scoped,
    personId: input.personId,
    text: input.text,
    date: input.date,
    createdAt: now(),
  };
  return store.news.insert(row);
}

export async function listReminders(
  tenantId: string,
  store: RolodexStore = defaultStore(),
  opts?: ListByPersonOpts,
): Promise<Reminder[]> {
  const scoped = requireTenantId(tenantId);
  return store.reminders.list(scoped, opts);
}

export async function createReminder(
  tenantId: string,
  input: CreateReminderInput,
  store: RolodexStore = defaultStore(),
): Promise<Reminder> {
  const scoped = requireTenantId(tenantId);
  await assertPerson(scoped, "personId", input.personId, store);
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
  return store.reminders.insert(row);
}

export async function getReminder(
  tenantId: string,
  id: string,
  store: RolodexStore = defaultStore(),
): Promise<Reminder | null> {
  const scoped = requireTenantId(tenantId);
  return store.reminders.get(scoped, id);
}

export async function updateReminder(
  tenantId: string,
  id: string,
  input: { done?: boolean; doneAt?: string | null; text?: string },
  store: RolodexStore = defaultStore(),
): Promise<Reminder | null> {
  const scoped = requireTenantId(tenantId);
  return store.reminders.update(scoped, id, input);
}

export async function listGifts(
  tenantId: string,
  store: RolodexStore = defaultStore(),
  opts?: ListByPersonOpts,
): Promise<Gift[]> {
  const scoped = requireTenantId(tenantId);
  return store.gifts.list(scoped, opts);
}

export async function createGift(
  tenantId: string,
  input: CreateGiftInput,
  store: RolodexStore = defaultStore(),
): Promise<Gift> {
  const scoped = requireTenantId(tenantId);
  assertOneOf(GIFT_KINDS, input.kind, "kind", "Invalid gift kind");
  await assertPerson(scoped, "personId", input.personId, store);
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
  return store.gifts.insert(row);
}

export async function deleteGift(
  tenantId: string,
  id: string,
  store: RolodexStore = defaultStore(),
): Promise<boolean> {
  const scoped = requireTenantId(tenantId);
  return store.gifts.delete(scoped, id);
}

export async function listConnections(
  tenantId: string,
  store: RolodexStore = defaultStore(),
  opts?: { personId?: string },
): Promise<Connection[]> {
  const scoped = requireTenantId(tenantId);
  return store.connections.list(scoped, opts);
}

export async function createConnection(
  tenantId: string,
  input: CreateConnectionInput,
  store: RolodexStore = defaultStore(),
): Promise<Connection> {
  const scoped = requireTenantId(tenantId);
  assertOneOf(CONNECTION_KINDS, input.kind, "kind", "Invalid connection kind");
  if (input.personA === input.personB) {
    throw new InputError("personB", "Cannot connect a person to themselves");
  }
  await assertPerson(scoped, "personA", input.personA, store);
  await assertPerson(scoped, "personB", input.personB, store);
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
  return store.connections.insert(row);
}

export async function deleteConnection(
  tenantId: string,
  id: string,
  store: RolodexStore = defaultStore(),
): Promise<boolean> {
  const scoped = requireTenantId(tenantId);
  return store.connections.delete(scoped, id);
}

export type ImportedPerson = {
  person: CreatePersonInput;
  birthday?: { month: number; day: number; year: number | null } | null;
};

/** Builds every row first, then hands them over in one all-or-nothing write. */
export async function createPeople(
  tenantId: string,
  entries: ImportedPerson[],
  store: RolodexStore = defaultStore(),
): Promise<void> {
  const scoped = requireTenantId(tenantId);
  const rows: Person[] = [];
  const dates: ImportantDate[] = [];
  for (const { person, birthday } of entries) {
    assertPersonText(person);
    const row = personRow(scoped, person);
    rows.push(row);
    if (birthday) {
      dates.push({
        id: newId(),
        tenantId: scoped,
        personId: row.id,
        type: "birthday",
        label: null,
        ...birthday,
        createdAt: now(),
      });
    }
  }
  await store.importPeople(rows, dates);
}
