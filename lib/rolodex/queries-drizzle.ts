import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "../db";
import type { WriteOpts } from "../db/batch-transaction";
import { computeStatus } from "./cadence";
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
import type {
  Connection,
  CreateImportantDateInput,
  Fact,
  Gift,
  ImportantDate,
  Interaction,
  ListByPersonOpts,
  ListPeopleOpts,
  NewsItem,
  Person,
  PersonComputed,
  Reminder,
  UpdatePersonInput,
} from "./queries-shared";
import { applyPersonPatch, clone, personMatchesSearch } from "./queries-shared";

function requireRolodexDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Rolodex store required");
  }
  return getDb();
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

export async function listPeopleInDrizzle(
  scoped: string,
  opts?: ListPeopleOpts,
): Promise<PersonComputed[]> {
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
    const person = await getPersonInDrizzle(scoped, row.id);
    if (person) {
      result.push(person);
    }
  }
  return result;
}

export async function getPersonInDrizzle(
  scoped: string,
  id: string,
): Promise<PersonComputed | null> {
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

export async function insertPerson(
  row: Person,
  opts?: WriteOpts,
): Promise<Person> {
  if (opts?.batch) {
    opts.batch.insert(people, row);
    return clone(row);
  }

  const [inserted] = await requireRolodexDb()
    .insert(people)
    .values(row)
    .returning();
  return inserted;
}

export async function updatePersonInDrizzle(
  scoped: string,
  id: string,
  input: UpdatePersonInput,
): Promise<Person | null> {
  const existing = await getPersonInDrizzle(scoped, id);
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

export async function deletePersonInDrizzle(
  scoped: string,
  id: string,
): Promise<boolean> {
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
  scoped: string,
  table: ChildTable,
  opts?: ListByPersonOpts,
): Promise<T[]> {
  const db = requireRolodexDb();
  const where =
    opts?.personId != null
      ? and(eq(table.tenantId, scoped), eq(table.personId, opts.personId))
      : eq(table.tenantId, scoped);
  return db.select().from(table).where(where) as Promise<T[]>;
}

export async function listInteractionsInDrizzle(
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<Interaction[]> {
  return listChildren<Interaction>(scoped, interactions, opts);
}

export async function insertInteraction(
  row: Interaction,
  opts?: WriteOpts,
): Promise<Interaction> {
  if (opts?.batch) {
    opts.batch.insert(interactions, row);
    return clone(row);
  }

  const [inserted] = await requireRolodexDb()
    .insert(interactions)
    .values(row)
    .returning();
  return inserted;
}

export async function listImportantDatesInDrizzle(
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<ImportantDate[]> {
  return listChildren<ImportantDate>(scoped, importantDates, opts);
}

export async function insertImportantDate(
  row: ImportantDate,
  opts?: WriteOpts,
): Promise<ImportantDate> {
  if (opts?.batch) {
    opts.batch.insert(importantDates, row);
    return clone(row);
  }

  const [inserted] = await requireRolodexDb()
    .insert(importantDates)
    .values(row)
    .returning();
  return inserted;
}

export async function getImportantDateInDrizzle(
  scoped: string,
  id: string,
): Promise<ImportantDate | null> {
  const [row] = await requireRolodexDb()
    .select()
    .from(importantDates)
    .where(tenantRow(importantDates, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function updateImportantDateInDrizzle(
  scoped: string,
  id: string,
  input: Partial<CreateImportantDateInput>,
): Promise<ImportantDate | null> {
  const [row] = await requireRolodexDb()
    .update(importantDates)
    .set({
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.month !== undefined ? { month: input.month } : {}),
      ...(input.day !== undefined ? { day: input.day } : {}),
      ...(input.year !== undefined ? { year: input.year } : {}),
    })
    .where(tenantRow(importantDates, scoped, id))
    .returning();
  return row ?? null;
}

export async function deleteImportantDateInDrizzle(
  scoped: string,
  id: string,
): Promise<boolean> {
  const deleted = await requireRolodexDb()
    .delete(importantDates)
    .where(tenantRow(importantDates, scoped, id))
    .returning({ id: importantDates.id });
  return deleted.length > 0;
}

export async function listFactsInDrizzle(
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<Fact[]> {
  return listChildren<Fact>(scoped, facts, opts);
}

export async function insertFact(row: Fact, opts?: WriteOpts): Promise<Fact> {
  if (opts?.batch) {
    opts.batch.insert(facts, row);
    return clone(row);
  }

  const [inserted] = await requireRolodexDb()
    .insert(facts)
    .values(row)
    .returning();
  return inserted;
}

export async function listNewsInDrizzle(
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<NewsItem[]> {
  return listChildren<NewsItem>(scoped, news, opts);
}

export async function insertNews(
  row: NewsItem,
  opts?: WriteOpts,
): Promise<NewsItem> {
  if (opts?.batch) {
    opts.batch.insert(news, row);
    return clone(row);
  }

  const [inserted] = await requireRolodexDb()
    .insert(news)
    .values(row)
    .returning();
  return inserted;
}

export async function listRemindersInDrizzle(
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<Reminder[]> {
  return listChildren<Reminder>(scoped, reminders, opts);
}

export async function insertReminder(
  row: Reminder,
  opts?: WriteOpts,
): Promise<Reminder> {
  if (opts?.batch) {
    opts.batch.insert(reminders, row);
    return clone(row);
  }

  const [inserted] = await requireRolodexDb()
    .insert(reminders)
    .values(row)
    .returning();
  return inserted;
}

export async function getReminderInDrizzle(
  scoped: string,
  id: string,
): Promise<Reminder | null> {
  const [row] = await requireRolodexDb()
    .select()
    .from(reminders)
    .where(tenantRow(reminders, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function updateReminderInDrizzle(
  scoped: string,
  id: string,
  input: { done?: boolean; doneAt?: string | null; text?: string },
): Promise<Reminder | null> {
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

export async function listGiftsInDrizzle(
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<Gift[]> {
  return listChildren<Gift>(scoped, gifts, opts);
}

export async function insertGift(row: Gift, opts?: WriteOpts): Promise<Gift> {
  if (opts?.batch) {
    opts.batch.insert(gifts, row);
    return clone(row);
  }

  const [inserted] = await requireRolodexDb()
    .insert(gifts)
    .values(row)
    .returning();
  return inserted;
}

export async function deleteGiftInDrizzle(
  scoped: string,
  id: string,
): Promise<boolean> {
  const deleted = await requireRolodexDb()
    .delete(gifts)
    .where(tenantRow(gifts, scoped, id))
    .returning({ id: gifts.id });
  return deleted.length > 0;
}

export async function listConnectionsInDrizzle(
  scoped: string,
  opts?: { personId?: string },
): Promise<Connection[]> {
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

export async function insertConnection(
  row: Connection,
  opts?: WriteOpts,
): Promise<Connection> {
  if (opts?.batch) {
    opts.batch.insert(connections, row);
    return clone(row);
  }

  const [inserted] = await requireRolodexDb()
    .insert(connections)
    .values(row)
    .returning();
  return inserted;
}

export async function deleteConnectionInDrizzle(
  scoped: string,
  id: string,
): Promise<boolean> {
  const deleted = await requireRolodexDb()
    .delete(connections)
    .where(tenantRow(connections, scoped, id))
    .returning({ id: connections.id });
  return deleted.length > 0;
}
