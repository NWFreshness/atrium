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
import {
  applyPersonPatch,
  clone,
  enrichPerson,
  personMatchesSearch,
} from "./queries-shared";

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

function findScoped<T extends { id: string; tenantId: string }>(
  rows: T[],
  tenantId: string,
  id: string,
): T | undefined {
  return rows.find((row) => row.tenantId === tenantId && row.id === id);
}

function listChildrenInMemory<T extends { tenantId: string; personId: string }>(
  rows: T[],
  scoped: string,
  opts?: ListByPersonOpts,
): T[] {
  return rows
    .filter(
      (row) =>
        row.tenantId === scoped &&
        (opts?.personId == null || row.personId === opts.personId),
    )
    .map(clone);
}

export function listPeopleInMemory(
  repo: RolodexRepository,
  scoped: string,
  opts?: ListPeopleOpts,
): PersonComputed[] {
  return repo.people
    .filter((row) => row.tenantId === scoped && personMatchesSearch(row, opts))
    .map((row) => enrichPerson(row, repo));
}

export function getPersonInMemory(
  repo: RolodexRepository,
  scoped: string,
  id: string,
): PersonComputed | null {
  const row = findScoped(repo.people, scoped, id);
  return row ? enrichPerson(row, repo) : null;
}

export function createPersonInMemory(
  repo: RolodexRepository,
  row: Person,
): Person {
  repo.people.push(row);
  return clone(row);
}

export function updatePersonInMemory(
  repo: RolodexRepository,
  scoped: string,
  id: string,
  input: UpdatePersonInput,
): Person | null {
  const row = findScoped(repo.people, scoped, id);
  if (!row) {
    return null;
  }
  applyPersonPatch(row, input);
  return clone(row);
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

export function deletePersonInMemory(
  repo: RolodexRepository,
  scoped: string,
  id: string,
): boolean {
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

export function listInteractionsInMemory(
  repo: RolodexRepository,
  scoped: string,
  opts?: ListByPersonOpts,
): Interaction[] {
  return listChildrenInMemory(repo.interactions, scoped, opts);
}

export function createInteractionInMemory(
  repo: RolodexRepository,
  row: Interaction,
): Interaction {
  repo.interactions.push(row);
  return clone(row);
}

export function listImportantDatesInMemory(
  repo: RolodexRepository,
  scoped: string,
  opts?: ListByPersonOpts,
): ImportantDate[] {
  return listChildrenInMemory(repo.importantDates, scoped, opts);
}

export function createImportantDateInMemory(
  repo: RolodexRepository,
  row: ImportantDate,
): ImportantDate {
  repo.importantDates.push(row);
  return clone(row);
}

export function getImportantDateInMemory(
  repo: RolodexRepository,
  scoped: string,
  id: string,
): ImportantDate | null {
  const row = findScoped(repo.importantDates, scoped, id);
  return row ? clone(row) : null;
}

export function updateImportantDateInMemory(
  repo: RolodexRepository,
  scoped: string,
  id: string,
  input: Partial<CreateImportantDateInput>,
): ImportantDate | null {
  const row = findScoped(repo.importantDates, scoped, id);
  if (!row) {
    return null;
  }
  if (input.type !== undefined) row.type = input.type;
  if (input.label !== undefined) row.label = input.label;
  if (input.month !== undefined) row.month = input.month;
  if (input.day !== undefined) row.day = input.day;
  if (input.year !== undefined) row.year = input.year;
  return clone(row);
}

export function deleteImportantDateInMemory(
  repo: RolodexRepository,
  scoped: string,
  id: string,
): boolean {
  const index = repo.importantDates.findIndex(
    (row) => row.tenantId === scoped && row.id === id,
  );
  if (index === -1) {
    return false;
  }
  repo.importantDates.splice(index, 1);
  return true;
}

export function listFactsInMemory(
  repo: RolodexRepository,
  scoped: string,
  opts?: ListByPersonOpts,
): Fact[] {
  return listChildrenInMemory(repo.facts, scoped, opts);
}

export function createFactInMemory(repo: RolodexRepository, row: Fact): Fact {
  repo.facts.push(row);
  return clone(row);
}

export function listNewsInMemory(
  repo: RolodexRepository,
  scoped: string,
  opts?: ListByPersonOpts,
): NewsItem[] {
  return listChildrenInMemory(repo.news, scoped, opts);
}

export function createNewsInMemory(
  repo: RolodexRepository,
  row: NewsItem,
): NewsItem {
  repo.news.push(row);
  return clone(row);
}

export function listRemindersInMemory(
  repo: RolodexRepository,
  scoped: string,
  opts?: ListByPersonOpts,
): Reminder[] {
  return listChildrenInMemory(repo.reminders, scoped, opts);
}

export function createReminderInMemory(
  repo: RolodexRepository,
  row: Reminder,
): Reminder {
  repo.reminders.push(row);
  return clone(row);
}

export function getReminderInMemory(
  repo: RolodexRepository,
  scoped: string,
  id: string,
): Reminder | null {
  const row = findScoped(repo.reminders, scoped, id);
  return row ? clone(row) : null;
}

export function updateReminderInMemory(
  repo: RolodexRepository,
  scoped: string,
  id: string,
  input: { done?: boolean; doneAt?: string | null; text?: string },
): Reminder | null {
  const row = findScoped(repo.reminders, scoped, id);
  if (!row) {
    return null;
  }
  if (input.done !== undefined) row.done = input.done;
  if (input.doneAt !== undefined) row.doneAt = input.doneAt;
  if (input.text !== undefined) row.text = input.text;
  return clone(row);
}

export function listGiftsInMemory(
  repo: RolodexRepository,
  scoped: string,
  opts?: ListByPersonOpts,
): Gift[] {
  return listChildrenInMemory(repo.gifts, scoped, opts);
}

export function createGiftInMemory(repo: RolodexRepository, row: Gift): Gift {
  repo.gifts.push(row);
  return clone(row);
}

export function deleteGiftInMemory(
  repo: RolodexRepository,
  scoped: string,
  id: string,
): boolean {
  const index = repo.gifts.findIndex(
    (row) => row.tenantId === scoped && row.id === id,
  );
  if (index === -1) {
    return false;
  }
  repo.gifts.splice(index, 1);
  return true;
}

export function listConnectionsInMemory(
  repo: RolodexRepository,
  scoped: string,
  opts?: { personId?: string },
): Connection[] {
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

export function createConnectionInMemory(
  repo: RolodexRepository,
  row: Connection,
): Connection {
  repo.connections.push(row);
  return clone(row);
}

export function deleteConnectionInMemory(
  repo: RolodexRepository,
  scoped: string,
  id: string,
): boolean {
  const index = repo.connections.findIndex(
    (row) => row.tenantId === scoped && row.id === id,
  );
  if (index === -1) {
    return false;
  }
  repo.connections.splice(index, 1);
  return true;
}
