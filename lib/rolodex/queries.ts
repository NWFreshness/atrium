import { and, desc, eq, or, type InferSelectModel } from "drizzle-orm";
import { getDb } from "../db";
import { computeStatus } from "./cadence";
import type {
  CheckInStatus,
  Circle,
  ConnectionKind,
  GiftKind,
  ImportantDateType,
  InteractionType,
} from "./constants";
import {
  connections,
  facts,
  gifts,
  importantDates,
  interactions,
  news,
  people,
  reminders,
} from "./schema";

export type Person = InferSelectModel<typeof people>;
export type Interaction = InferSelectModel<typeof interactions>;
export type ImportantDate = InferSelectModel<typeof importantDates>;
export type Fact = InferSelectModel<typeof facts>;
export type NewsItem = InferSelectModel<typeof news>;
export type Reminder = InferSelectModel<typeof reminders>;
export type Gift = InferSelectModel<typeof gifts>;
export type Connection = InferSelectModel<typeof connections>;

export type LatestNews = { id: string; text: string; date: string };

export type PersonComputed = Person & {
  lastContacted: string | null;
  nextDue: string | null;
  status: CheckInStatus;
  latestNews: LatestNews | null;
};

export type RolodexRepository = {
  people: Person[];
  interactions: Interaction[];
  importantDates: ImportantDate[];
  facts: Fact[];
  news: NewsItem[];
  reminders: Reminder[];
  gifts: Gift[];
  connections: Connection[];
};

export type CreatePersonInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  city?: string | null;
  timezone?: string | null;
  circle?: Circle;
  cadenceOverrideDays?: number | null;
  checkinsOff?: boolean;
  snoozedUntil?: string | null;
  howMet?: string | null;
  metWhere?: string | null;
  metOn?: string | null;
  notes?: string | null;
  tags?: string[];
};

export type UpdatePersonInput = Partial<CreatePersonInput>;

export type CreateInteractionInput = {
  personId: string;
  type: InteractionType;
  date: string;
  notes?: string | null;
};

export type CreateImportantDateInput = {
  personId: string;
  type: ImportantDateType;
  label?: string | null;
  month: number;
  day: number;
  year?: number | null;
};

export type CreateFactInput = { personId: string; text: string };
export type CreateNewsInput = { personId: string; text: string; date: string };
export type CreateReminderInput = {
  personId: string;
  text: string;
  dueDate: string;
  done?: boolean;
  doneAt?: string | null;
};
export type CreateGiftInput = {
  personId: string;
  name: string;
  kind: GiftKind;
  occasion?: string | null;
  date: string;
};
export type CreateConnectionInput = {
  personA: string;
  personB: string;
  kind: ConnectionKind;
  aIsParent?: boolean;
  label?: string | null;
  inverseLabel?: string | null;
  note?: string | null;
};

export type ListByPersonOpts = { personId?: string };

export function createMemoryRolodexRepository(): RolodexRepository {
  return {
    people: [],
    interactions: [],
    importantDates: [],
    facts: [],
    news: [],
    reminders: [],
    gifts: [],
    connections: [],
  };
}

function requireTenantId(tenantId: string): string {
  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new Error("tenantId is required");
  }
  return tenantId;
}

function requireRolodexDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Rolodex store required");
  }
  return getDb();
}

function newId(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
}

function clone<T>(row: T): T {
  return structuredClone(row);
}

function findScoped<T extends { id: string; tenantId: string }>(
  rows: T[],
  tenantId: string,
  id: string,
): T | undefined {
  return rows.find((row) => row.tenantId === tenantId && row.id === id);
}

function tenantRow(
  table:
    | typeof people
    | typeof interactions
    | typeof importantDates
    | typeof facts
    | typeof news
    | typeof reminders
    | typeof gifts
    | typeof connections,
  tenantId: string,
  id: string,
) {
  return and(eq(table.tenantId, tenantId), eq(table.id, id));
}

function lastContactedFor(
  personId: string,
  tenantId: string,
  repo: RolodexRepository,
): string | null {
  const dates = repo.interactions
    .filter((row) => row.tenantId === tenantId && row.personId === personId)
    .map((row) => row.date)
    .sort();
  return dates.at(-1) ?? null;
}

function latestNewsFor(
  personId: string,
  tenantId: string,
  repo: RolodexRepository,
): LatestNews | null {
  const items = repo.news
    .filter((row) => row.tenantId === tenantId && row.personId === personId)
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date < b.date ? 1 : -1;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  const top = items[0];
  return top ? { id: top.id, text: top.text, date: top.date } : null;
}

function enrichPerson(row: Person, repo: RolodexRepository): PersonComputed {
  const lastContacted = lastContactedFor(row.id, row.tenantId, repo);
  const computed = computeStatus(row, lastContacted);
  return {
    ...clone(row),
    lastContacted,
    nextDue: computed.nextDue,
    status: computed.status,
    latestNews: latestNewsFor(row.id, row.tenantId, repo),
  };
}

export type ListPeopleOpts = {
  q?: string;
  circle?: Circle;
  tag?: string;
};

function personMatchesSearch(row: Person, opts?: ListPeopleOpts): boolean {
  if (opts?.circle && row.circle !== opts.circle) {
    return false;
  }
  if (opts?.tag && !row.tags.includes(opts.tag)) {
    return false;
  }
  const term = opts?.q?.trim().toLowerCase();
  if (!term) {
    return true;
  }
  return [row.name, row.company, row.email].some((value) =>
    value?.toLowerCase().includes(term),
  );
}

export async function listPeople(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListPeopleOpts,
): Promise<PersonComputed[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.people
      .filter(
        (row) => row.tenantId === scoped && personMatchesSearch(row, opts),
      )
      .map((row) => enrichPerson(row, repo));
  }
  const db = requireRolodexDb();
  const rows = await db
    .select()
    .from(people)
    .where(eq(people.tenantId, scoped));
  const result: PersonComputed[] = [];
  for (const row of rows) {
    if (!personMatchesSearch(row, opts)) {
      continue;
    }
    const person = await getPerson(scoped, row.id);
    if (person) {
      result.push(person);
    }
  }
  return result;
}

export async function getPerson(
  tenantId: string,
  id: string,
  repo?: RolodexRepository,
): Promise<PersonComputed | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.people, scoped, id);
    return row ? enrichPerson(row, repo) : null;
  }
  const db = requireRolodexDb();
  const [row] = await db
    .select()
    .from(people)
    .where(tenantRow(people, scoped, id))
    .limit(1);
  if (!row) {
    return null;
  }
  const [contacted] = await db
    .select({ date: interactions.date })
    .from(interactions)
    .where(
      and(eq(interactions.tenantId, scoped), eq(interactions.personId, id)),
    )
    .orderBy(desc(interactions.date))
    .limit(1);
  const [newsRow] = await db
    .select()
    .from(news)
    .where(and(eq(news.tenantId, scoped), eq(news.personId, id)))
    .orderBy(desc(news.date), desc(news.createdAt))
    .limit(1);
  const lastContacted = contacted?.date ?? null;
  const computed = computeStatus(row, lastContacted);
  return {
    ...row,
    lastContacted,
    nextDue: computed.nextDue,
    status: computed.status,
    latestNews: newsRow
      ? { id: newsRow.id, text: newsRow.text, date: newsRow.date }
      : null,
  };
}

function personRow(scoped: string, input: CreatePersonInput): Person {
  const created = now();
  return {
    id: newId(),
    tenantId: scoped,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    jobTitle: input.jobTitle ?? null,
    company: input.company ?? null,
    city: input.city ?? null,
    timezone: input.timezone ?? null,
    circle: input.circle ?? "close",
    cadenceOverrideDays: input.cadenceOverrideDays ?? null,
    checkinsOff: input.checkinsOff ?? false,
    snoozedUntil: input.snoozedUntil ?? null,
    howMet: input.howMet ?? null,
    metWhere: input.metWhere ?? null,
    metOn: input.metOn ?? null,
    notes: input.notes ?? null,
    tags: input.tags ?? [],
    createdAt: created,
    updatedAt: created,
  };
}

export async function createPerson(
  tenantId: string,
  input: CreatePersonInput,
  repo?: RolodexRepository,
): Promise<Person> {
  const scoped = requireTenantId(tenantId);
  const row = personRow(scoped, input);
  if (repo) {
    repo.people.push(row);
    return clone(row);
  }
  const [inserted] = await requireRolodexDb()
    .insert(people)
    .values(row)
    .returning();
  return inserted;
}

function applyPersonPatch(row: Person, input: UpdatePersonInput): void {
  if (input.name !== undefined) row.name = input.name;
  if (input.email !== undefined) row.email = input.email;
  if (input.phone !== undefined) row.phone = input.phone;
  if (input.jobTitle !== undefined) row.jobTitle = input.jobTitle;
  if (input.company !== undefined) row.company = input.company;
  if (input.city !== undefined) row.city = input.city;
  if (input.timezone !== undefined) row.timezone = input.timezone;
  if (input.circle !== undefined) row.circle = input.circle;
  if (input.cadenceOverrideDays !== undefined) {
    row.cadenceOverrideDays = input.cadenceOverrideDays;
  }
  if (input.checkinsOff !== undefined) row.checkinsOff = input.checkinsOff;
  if (input.snoozedUntil !== undefined) row.snoozedUntil = input.snoozedUntil;
  if (input.howMet !== undefined) row.howMet = input.howMet;
  if (input.metWhere !== undefined) row.metWhere = input.metWhere;
  if (input.metOn !== undefined) row.metOn = input.metOn;
  if (input.notes !== undefined) row.notes = input.notes;
  if (input.tags !== undefined) row.tags = input.tags;
  row.updatedAt = now();
}

export async function updatePerson(
  tenantId: string,
  id: string,
  input: UpdatePersonInput,
  repo?: RolodexRepository,
): Promise<Person | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.people, scoped, id);
    if (!row) {
      return null;
    }
    applyPersonPatch(row, input);
    return clone(row);
  }
  const existing = await getPerson(scoped, id);
  if (!existing) {
    return null;
  }
  applyPersonPatch(existing, input);
  const [row] = await requireRolodexDb()
    .update(people)
    .set({
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
      jobTitle: existing.jobTitle,
      company: existing.company,
      city: existing.city,
      timezone: existing.timezone,
      circle: existing.circle,
      cadenceOverrideDays: existing.cadenceOverrideDays,
      checkinsOff: existing.checkinsOff,
      snoozedUntil: existing.snoozedUntil,
      howMet: existing.howMet,
      metWhere: existing.metWhere,
      metOn: existing.metOn,
      notes: existing.notes,
      tags: existing.tags,
      updatedAt: existing.updatedAt,
    })
    .where(tenantRow(people, scoped, id))
    .returning();
  return row ?? null;
}

function wipePersonChildren(
  repo: RolodexRepository,
  tenantId: string,
  id: string,
) {
  const drop = <
    T extends {
      tenantId: string;
      personId?: string;
      personA?: string;
      personB?: string;
    },
  >(
    rows: T[],
    match: (row: T) => boolean,
  ) => {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (rows[i]!.tenantId === tenantId && match(rows[i]!)) {
        rows.splice(i, 1);
      }
    }
  };
  drop(repo.interactions, (row) => row.personId === id);
  drop(repo.importantDates, (row) => row.personId === id);
  drop(repo.facts, (row) => row.personId === id);
  drop(repo.news, (row) => row.personId === id);
  drop(repo.reminders, (row) => row.personId === id);
  drop(repo.gifts, (row) => row.personId === id);
  drop(repo.connections, (row) => row.personA === id || row.personB === id);
}

export async function deletePerson(
  tenantId: string,
  id: string,
  repo?: RolodexRepository,
): Promise<boolean> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const index = repo.people.findIndex(
      (row) => row.tenantId === scoped && row.id === id,
    );
    if (index === -1) {
      return false;
    }
    wipePersonChildren(repo, scoped, id);
    repo.people.splice(index, 1);
    return true;
  }
  const deleted = await requireRolodexDb()
    .delete(people)
    .where(tenantRow(people, scoped, id))
    .returning({ id: people.id });
  return deleted.length > 0;
}

type ChildTable =
  | typeof interactions
  | typeof importantDates
  | typeof facts
  | typeof news
  | typeof reminders
  | typeof gifts;

async function listChildren<T extends { tenantId: string; personId: string }>(
  tenantId: string,
  rows: T[],
  table: ChildTable,
  repo: RolodexRepository | undefined,
  opts?: ListByPersonOpts,
): Promise<T[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return rows
      .filter(
        (row) =>
          row.tenantId === scoped &&
          (opts?.personId == null || row.personId === opts.personId),
      )
      .map(clone);
  }
  const db = requireRolodexDb();
  const where =
    opts?.personId != null
      ? and(eq(table.tenantId, scoped), eq(table.personId, opts.personId))
      : eq(table.tenantId, scoped);
  return db.select().from(table).where(where) as Promise<T[]>;
}

export async function listInteractions(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<Interaction[]> {
  return listChildren(
    tenantId,
    repo?.interactions ?? [],
    interactions,
    repo,
    opts,
  );
}

export async function createInteraction(
  tenantId: string,
  input: CreateInteractionInput,
  repo?: RolodexRepository,
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
    repo.interactions.push(row);
    return clone(row);
  }
  const [inserted] = await requireRolodexDb()
    .insert(interactions)
    .values(row)
    .returning();
  return inserted;
}

export async function listImportantDates(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<ImportantDate[]> {
  return listChildren(
    tenantId,
    repo?.importantDates ?? [],
    importantDates,
    repo,
    opts,
  );
}

export async function createImportantDate(
  tenantId: string,
  input: CreateImportantDateInput,
  repo?: RolodexRepository,
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
    repo.importantDates.push(row);
    return clone(row);
  }
  const [inserted] = await requireRolodexDb()
    .insert(importantDates)
    .values(row)
    .returning();
  return inserted;
}

export async function listFacts(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<Fact[]> {
  return listChildren(tenantId, repo?.facts ?? [], facts, repo, opts);
}

export async function createFact(
  tenantId: string,
  input: CreateFactInput,
  repo?: RolodexRepository,
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
    repo.facts.push(row);
    return clone(row);
  }
  const [inserted] = await requireRolodexDb()
    .insert(facts)
    .values(row)
    .returning();
  return inserted;
}

export async function listNews(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<NewsItem[]> {
  return listChildren(tenantId, repo?.news ?? [], news, repo, opts);
}

export async function createNews(
  tenantId: string,
  input: CreateNewsInput,
  repo?: RolodexRepository,
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
    repo.news.push(row);
    return clone(row);
  }
  const [inserted] = await requireRolodexDb()
    .insert(news)
    .values(row)
    .returning();
  return inserted;
}

export async function listReminders(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<Reminder[]> {
  return listChildren(tenantId, repo?.reminders ?? [], reminders, repo, opts);
}

export async function createReminder(
  tenantId: string,
  input: CreateReminderInput,
  repo?: RolodexRepository,
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
    repo.reminders.push(row);
    return clone(row);
  }
  const [inserted] = await requireRolodexDb()
    .insert(reminders)
    .values(row)
    .returning();
  return inserted;
}

export async function getReminder(
  tenantId: string,
  id: string,
  repo?: RolodexRepository,
): Promise<Reminder | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.reminders, scoped, id);
    return row ? clone(row) : null;
  }
  const [row] = await requireRolodexDb()
    .select()
    .from(reminders)
    .where(tenantRow(reminders, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function updateReminder(
  tenantId: string,
  id: string,
  input: { done?: boolean; doneAt?: string | null; text?: string },
  repo?: RolodexRepository,
): Promise<Reminder | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.reminders, scoped, id);
    if (!row) {
      return null;
    }
    if (input.done !== undefined) row.done = input.done;
    if (input.doneAt !== undefined) row.doneAt = input.doneAt;
    if (input.text !== undefined) row.text = input.text;
    return clone(row);
  }
  const [row] = await requireRolodexDb()
    .update(reminders)
    .set({
      ...(input.done !== undefined ? { done: input.done } : {}),
      ...(input.doneAt !== undefined ? { doneAt: input.doneAt } : {}),
      ...(input.text !== undefined ? { text: input.text } : {}),
    })
    .where(tenantRow(reminders, scoped, id))
    .returning();
  return row ?? null;
}

export async function listGifts(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: ListByPersonOpts,
): Promise<Gift[]> {
  return listChildren(tenantId, repo?.gifts ?? [], gifts, repo, opts);
}

export async function createGift(
  tenantId: string,
  input: CreateGiftInput,
  repo?: RolodexRepository,
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
    repo.gifts.push(row);
    return clone(row);
  }
  const [inserted] = await requireRolodexDb()
    .insert(gifts)
    .values(row)
    .returning();
  return inserted;
}

export async function listConnections(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: { personId?: string },
): Promise<Connection[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.connections
      .filter(
        (row) =>
          row.tenantId === scoped &&
          (opts?.personId == null ||
            row.personA === opts.personId ||
            row.personB === opts.personId),
      )
      .map(clone);
  }
  const db = requireRolodexDb();
  if (opts?.personId) {
    return db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.tenantId, scoped),
          or(
            eq(connections.personA, opts.personId),
            eq(connections.personB, opts.personId),
          ),
        ),
      );
  }
  return db.select().from(connections).where(eq(connections.tenantId, scoped));
}

export async function createConnection(
  tenantId: string,
  input: CreateConnectionInput,
  repo?: RolodexRepository,
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
    repo.connections.push(row);
    return clone(row);
  }
  const [inserted] = await requireRolodexDb()
    .insert(connections)
    .values(row)
    .returning();
  return inserted;
}
