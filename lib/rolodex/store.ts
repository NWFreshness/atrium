import type { Database } from "../db";
import * as drizzle from "./queries-drizzle";
import * as memory from "./queries-memory";
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
  RolodexRepository,
  UpdatePersonInput,
} from "./queries-shared";

type Table<Row, Opts = ListByPersonOpts> = {
  list(tenantId: string, opts?: Opts): Promise<Row[]>;
  insert(row: Row): Promise<Row>;
};
type Gettable<Row> = { get(tenantId: string, id: string): Promise<Row | null> };
type Deletable = { delete(tenantId: string, id: string): Promise<boolean> };

/**
 * Everything Rolodex asks of its storage. Every read and every keyed write
 * takes the tenant first; the rules (validation, defaults, references) live
 * above this seam in `queries.ts`, so both adapters only store and fetch.
 */
export type RolodexStore = {
  people: Gettable<PersonComputed> &
    Deletable & {
      list(tenantId: string, opts?: ListPeopleOpts): Promise<PersonComputed[]>;
      insert(row: Person): Promise<Person>;
      update(
        tenantId: string,
        id: string,
        patch: UpdatePersonInput,
      ): Promise<Person | null>;
    };
  interactions: Table<Interaction>;
  importantDates: Table<ImportantDate> &
    Gettable<ImportantDate> &
    Deletable & {
      update(
        tenantId: string,
        id: string,
        patch: Partial<CreateImportantDateInput>,
      ): Promise<ImportantDate | null>;
    };
  facts: Table<Fact>;
  news: Table<NewsItem>;
  reminders: Table<Reminder> &
    Gettable<Reminder> & {
      update(
        tenantId: string,
        id: string,
        patch: { done?: boolean; doneAt?: string | null; text?: string },
      ): Promise<Reminder | null>;
    };
  gifts: Table<Gift> & Deletable;
  connections: Table<Connection, { personId?: string }> & Deletable;
  /** All rows land or none do: an import must not leave half a file behind. */
  importPeople(people: Person[], dates: ImportantDate[]): Promise<void>;
};

export function createMemoryRolodexStore(
  rows: RolodexRepository = memory.createMemoryRolodexRepository(),
): RolodexStore {
  return {
    people: {
      list: async (t, opts) => memory.listPeopleInMemory(rows, t, opts),
      get: async (t, id) => memory.getPersonInMemory(rows, t, id),
      insert: async (row) => memory.createPersonInMemory(rows, row),
      update: async (t, id, patch) =>
        memory.updatePersonInMemory(rows, t, id, patch),
      delete: async (t, id) => memory.deletePersonInMemory(rows, t, id),
    },
    interactions: {
      list: async (t, opts) => memory.listInteractionsInMemory(rows, t, opts),
      insert: async (row) => memory.createInteractionInMemory(rows, row),
    },
    importantDates: {
      list: async (t, opts) => memory.listImportantDatesInMemory(rows, t, opts),
      get: async (t, id) => memory.getImportantDateInMemory(rows, t, id),
      insert: async (row) => memory.createImportantDateInMemory(rows, row),
      update: async (t, id, patch) =>
        memory.updateImportantDateInMemory(rows, t, id, patch),
      delete: async (t, id) => memory.deleteImportantDateInMemory(rows, t, id),
    },
    facts: {
      list: async (t, opts) => memory.listFactsInMemory(rows, t, opts),
      insert: async (row) => memory.createFactInMemory(rows, row),
    },
    news: {
      list: async (t, opts) => memory.listNewsInMemory(rows, t, opts),
      insert: async (row) => memory.createNewsInMemory(rows, row),
    },
    reminders: {
      list: async (t, opts) => memory.listRemindersInMemory(rows, t, opts),
      get: async (t, id) => memory.getReminderInMemory(rows, t, id),
      insert: async (row) => memory.createReminderInMemory(rows, row),
      update: async (t, id, patch) =>
        memory.updateReminderInMemory(rows, t, id, patch),
    },
    gifts: {
      list: async (t, opts) => memory.listGiftsInMemory(rows, t, opts),
      insert: async (row) => memory.createGiftInMemory(rows, row),
      delete: async (t, id) => memory.deleteGiftInMemory(rows, t, id),
    },
    connections: {
      list: async (t, opts) => memory.listConnectionsInMemory(rows, t, opts),
      insert: async (row) => memory.createConnectionInMemory(rows, row),
      delete: async (t, id) => memory.deleteConnectionInMemory(rows, t, id),
    },
    importPeople: async (people, dates) =>
      memory.importPeopleInMemory(rows, people, dates),
  };
}

export function createDrizzleRolodexStore(db: Database): RolodexStore {
  return {
    people: {
      list: (t, opts) => drizzle.listPeopleInDrizzle(db, t, opts),
      get: (t, id) => drizzle.getPersonInDrizzle(db, t, id),
      insert: (row) => drizzle.insertPerson(db, row),
      update: (t, id, patch) => drizzle.updatePersonInDrizzle(db, t, id, patch),
      delete: (t, id) => drizzle.deletePersonInDrizzle(db, t, id),
    },
    interactions: {
      list: (t, opts) => drizzle.listInteractionsInDrizzle(db, t, opts),
      insert: (row) => drizzle.insertInteraction(db, row),
    },
    importantDates: {
      list: (t, opts) => drizzle.listImportantDatesInDrizzle(db, t, opts),
      get: (t, id) => drizzle.getImportantDateInDrizzle(db, t, id),
      insert: (row) => drizzle.insertImportantDate(db, row),
      update: (t, id, patch) =>
        drizzle.updateImportantDateInDrizzle(db, t, id, patch),
      delete: (t, id) => drizzle.deleteImportantDateInDrizzle(db, t, id),
    },
    facts: {
      list: (t, opts) => drizzle.listFactsInDrizzle(db, t, opts),
      insert: (row) => drizzle.insertFact(db, row),
    },
    news: {
      list: (t, opts) => drizzle.listNewsInDrizzle(db, t, opts),
      insert: (row) => drizzle.insertNews(db, row),
    },
    reminders: {
      list: (t, opts) => drizzle.listRemindersInDrizzle(db, t, opts),
      get: (t, id) => drizzle.getReminderInDrizzle(db, t, id),
      insert: (row) => drizzle.insertReminder(db, row),
      update: (t, id, patch) =>
        drizzle.updateReminderInDrizzle(db, t, id, patch),
    },
    gifts: {
      list: (t, opts) => drizzle.listGiftsInDrizzle(db, t, opts),
      insert: (row) => drizzle.insertGift(db, row),
      delete: (t, id) => drizzle.deleteGiftInDrizzle(db, t, id),
    },
    connections: {
      list: (t, opts) => drizzle.listConnectionsInDrizzle(db, t, opts),
      insert: (row) => drizzle.insertConnection(db, row),
      delete: (t, id) => drizzle.deleteConnectionInDrizzle(db, t, id),
    },
    importPeople: (people, dates) =>
      drizzle.importPeopleInDrizzle(db, people, dates),
  };
}
