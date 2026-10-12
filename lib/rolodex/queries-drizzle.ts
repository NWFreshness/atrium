import { and, desc, eq, or } from "drizzle-orm";
import type { Database } from "../db";
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
import { applyPersonPatch, personMatchesSearch } from "./queries-shared";

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
  db: Database,
  scoped: string,
  opts?: ListPeopleOpts,
): Promise<PersonComputed[]> {
  const rows = await db
    .select()
    .from(people)
    .where(eq(people.tenantId, scoped));
  const result: PersonComputed[] = [];
  for (const row of rows) {
    if (!personMatchesSearch(row, opts)) {
      continue;
    }
    const person = await getPersonInDrizzle(db, scoped, row.id);
    if (person) {
      result.push(person);
    }
  }
  return result;
}

export async function getPersonInDrizzle(
  db: Database,
  scoped: string,
  id: string,
): Promise<PersonComputed | null> {
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

export async function insertPerson(db: Database, row: Person): Promise<Person> {
  const [inserted] = await db.insert(people).values(row).returning();
  return inserted;
}

export async function updatePersonInDrizzle(
  db: Database,
  scoped: string,
  id: string,
  input: UpdatePersonInput,
): Promise<Person | null> {
  const existing = await getPersonInDrizzle(db, scoped, id);
  if (!existing) {
    return null;
  }
  applyPersonPatch(existing, input);
  const [row] = await db
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
  db: Database,
  scoped: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
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
  db: Database,
  scoped: string,
  table: ChildTable,
  opts?: ListByPersonOpts,
): Promise<T[]> {
  const where =
    opts?.personId != null
      ? and(eq(table.tenantId, scoped), eq(table.personId, opts.personId))
      : eq(table.tenantId, scoped);
  return db.select().from(table).where(where) as Promise<T[]>;
}

export async function listInteractionsInDrizzle(
  db: Database,
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<Interaction[]> {
  return listChildren<Interaction>(db, scoped, interactions, opts);
}

export async function insertInteraction(
  db: Database,
  row: Interaction,
): Promise<Interaction> {
  const [inserted] = await db.insert(interactions).values(row).returning();
  return inserted;
}

export async function listImportantDatesInDrizzle(
  db: Database,
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<ImportantDate[]> {
  return listChildren<ImportantDate>(db, scoped, importantDates, opts);
}

export async function insertImportantDate(
  db: Database,
  row: ImportantDate,
): Promise<ImportantDate> {
  const [inserted] = await db.insert(importantDates).values(row).returning();
  return inserted;
}

export async function getImportantDateInDrizzle(
  db: Database,
  scoped: string,
  id: string,
): Promise<ImportantDate | null> {
  const [row] = await db
    .select()
    .from(importantDates)
    .where(tenantRow(importantDates, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function updateImportantDateInDrizzle(
  db: Database,
  scoped: string,
  id: string,
  input: Partial<CreateImportantDateInput>,
): Promise<ImportantDate | null> {
  const [row] = await db
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
  db: Database,
  scoped: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(importantDates)
    .where(tenantRow(importantDates, scoped, id))
    .returning({ id: importantDates.id });
  return deleted.length > 0;
}

export async function listFactsInDrizzle(
  db: Database,
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<Fact[]> {
  return listChildren<Fact>(db, scoped, facts, opts);
}

export async function insertFact(db: Database, row: Fact): Promise<Fact> {
  const [inserted] = await db.insert(facts).values(row).returning();
  return inserted;
}

export async function listNewsInDrizzle(
  db: Database,
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<NewsItem[]> {
  return listChildren<NewsItem>(db, scoped, news, opts);
}

export async function insertNews(
  db: Database,
  row: NewsItem,
): Promise<NewsItem> {
  const [inserted] = await db.insert(news).values(row).returning();
  return inserted;
}

export async function listRemindersInDrizzle(
  db: Database,
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<Reminder[]> {
  return listChildren<Reminder>(db, scoped, reminders, opts);
}

export async function insertReminder(
  db: Database,
  row: Reminder,
): Promise<Reminder> {
  const [inserted] = await db.insert(reminders).values(row).returning();
  return inserted;
}

export async function getReminderInDrizzle(
  db: Database,
  scoped: string,
  id: string,
): Promise<Reminder | null> {
  const [row] = await db
    .select()
    .from(reminders)
    .where(tenantRow(reminders, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function updateReminderInDrizzle(
  db: Database,
  scoped: string,
  id: string,
  input: { done?: boolean; doneAt?: string | null; text?: string },
): Promise<Reminder | null> {
  const [row] = await db
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
  db: Database,
  scoped: string,
  opts?: ListByPersonOpts,
): Promise<Gift[]> {
  return listChildren<Gift>(db, scoped, gifts, opts);
}

export async function insertGift(db: Database, row: Gift): Promise<Gift> {
  const [inserted] = await db.insert(gifts).values(row).returning();
  return inserted;
}

export async function deleteGiftInDrizzle(
  db: Database,
  scoped: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(gifts)
    .where(tenantRow(gifts, scoped, id))
    .returning({ id: gifts.id });
  return deleted.length > 0;
}

export async function listConnectionsInDrizzle(
  db: Database,
  scoped: string,
  opts?: { personId?: string },
): Promise<Connection[]> {
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
  db: Database,
  row: Connection,
): Promise<Connection> {
  const [inserted] = await db.insert(connections).values(row).returning();
  return inserted;
}

export async function deleteConnectionInDrizzle(
  db: Database,
  scoped: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(connections)
    .where(tenantRow(connections, scoped, id))
    .returning({ id: connections.id });
  return deleted.length > 0;
}

/** One Neon batch is one transaction (ADR-0002): the import lands whole or not at all. */
export async function importPeopleInDrizzle(
  db: Database,
  rows: Person[],
  dates: ImportantDate[],
): Promise<void> {
  const [first, ...rest] = [
    ...rows.map((row) => db.insert(people).values(row)),
    ...dates.map((row) => db.insert(importantDates).values(row)),
  ];
  if (first) {
    await db.batch([first, ...rest]);
  }
}
