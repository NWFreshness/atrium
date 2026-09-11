import type { InferSelectModel } from "drizzle-orm";
import { computeStatus } from "./cadence";
import type {
  CheckInStatus,
  Circle,
  ConnectionKind,
  GiftKind,
  ImportantDateType,
  InteractionType,
} from "./constants";
import type {
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

export function requireTenantId(tenantId: string): string {
  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new Error("tenantId is required");
  }
  return tenantId;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): Date {
  return new Date();
}

export function clone<T>(row: T): T {
  return structuredClone(row);
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

export function enrichPerson(
  row: Person,
  repo: RolodexRepository,
): PersonComputed {
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

export function personMatchesSearch(
  row: Person,
  opts?: ListPeopleOpts,
): boolean {
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

export function personRow(scoped: string, input: CreatePersonInput): Person {
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

export function applyPersonPatch(row: Person, input: UpdatePersonInput): void {
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
