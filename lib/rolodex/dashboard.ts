import {
  CIRCLE_META,
  CIRCLES,
  type CheckInStatus,
  type Circle,
} from "./constants";
import { computeStatus } from "./cadence";
import { daysBetweenISO, nextOccurrence, todayISO } from "./dates";
import {
  listImportantDates,
  listInteractions,
  listNews,
  listPeople,
  listReminders,
  type ImportantDate,
  type Interaction,
  type NewsItem,
  type PersonComputed,
  type Reminder,
  type RolodexRepository,
} from "./queries";
import { buildTimeline, type TimelineEntry } from "./timeline";

export const UPCOMING_WINDOW_DAYS = 30;
export const RECENT_ACTIVITY_LIMIT = 30;

export type WhoToContact = {
  id: string;
  name: string;
  circle: Circle;
  status: CheckInStatus;
  lastContacted: string | null;
  nextDue: string | null;
  latestNews: PersonComputed["latestNews"];
  overdueDays: number;
};

export type UpcomingDate = {
  id: string;
  personId: string;
  personName: string;
  type: string;
  label: string | null;
  month: number;
  day: number;
  year: number | null;
  date: string;
  daysAway: number;
  ageTurning: number | null;
  milestone: boolean;
};

export type DueReminder = {
  id: string;
  personId: string;
  personName: string;
  text: string;
  dueDate: string;
  overdue: boolean;
  dueToday: boolean;
};

export type MonthCount = {
  key: string;
  label: string;
  count: number;
};

export type CircleCounts = {
  circle: Circle;
  label: string;
  total: number;
  inTouch: number;
  dueSoon: number;
  overdue: number;
  snoozed: number;
  off: number;
};

export type RolodexDashboard = {
  today: string;
  whoToContact: WhoToContact[];
  upcomingDates: UpcomingDate[];
  dueReminders: DueReminder[];
  recentActivity: TimelineEntry[];
  interactionsPerMonth: MonthCount[];
  peoplePerCircle: CircleCounts[];
};

function withTodayStatus(
  person: PersonComputed,
  today: string,
): PersonComputed {
  const computed = computeStatus(person, person.lastContacted, today);
  return {
    ...person,
    status: computed.status,
    nextDue: computed.nextDue,
  };
}

function overdueRank(person: PersonComputed, today: string): number {
  if (person.lastContacted == null) {
    return Number.MAX_SAFE_INTEGER;
  }
  return person.nextDue ? -daysBetweenISO(today, person.nextDue) : 0;
}

export function whoToContact(
  people: PersonComputed[],
  today: string,
): WhoToContact[] {
  return people
    .map((person) => withTodayStatus(person, today))
    .filter(
      (person) => person.status === "overdue" || person.status === "due_soon",
    )
    .sort(
      (left, right) =>
        overdueRank(right, today) - overdueRank(left, today) ||
        left.name.localeCompare(right.name),
    )
    .map((person) => ({
      id: person.id,
      name: person.name,
      circle: person.circle,
      status: person.status,
      lastContacted: person.lastContacted,
      nextDue: person.nextDue,
      latestNews: person.latestNews,
      overdueDays:
        person.status === "overdue" && person.nextDue
          ? Math.max(0, -daysBetweenISO(today, person.nextDue))
          : 0,
    }));
}

export function upcomingDates(
  dates: (ImportantDate & { personName: string })[],
  withinDays: number = UPCOMING_WINDOW_DAYS,
  today: string = todayISO(),
): UpcomingDate[] {
  const result: UpcomingDate[] = [];
  for (const row of dates) {
    const occurrence = nextOccurrence(row, today);
    const daysAway = daysBetweenISO(today, occurrence.date);
    if (daysAway <= withinDays) {
      result.push({
        id: row.id,
        personId: row.personId,
        personName: row.personName,
        type: row.type,
        label: row.label,
        month: row.month,
        day: row.day,
        year: row.year,
        date: occurrence.date,
        daysAway,
        ageTurning: occurrence.ageTurning,
        milestone: occurrence.milestone,
      });
    }
  }
  return result.sort((left, right) => left.daysAway - right.daysAway);
}

export function dueReminders(
  reminders: Reminder[],
  people: Pick<PersonComputed, "id" | "name">[],
  today: string,
): DueReminder[] {
  const names = new Map(people.map((person) => [person.id, person.name]));
  return reminders
    .filter((row) => !row.done && row.dueDate <= today)
    .map((row) => ({
      id: row.id,
      personId: row.personId,
      personName: names.get(row.personId) ?? "",
      text: row.text,
      dueDate: row.dueDate,
      overdue: row.dueDate < today,
      dueToday: row.dueDate === today,
    }))
    .sort((left, right) => {
      if (left.dueDate !== right.dueDate) {
        return left.dueDate < right.dueDate ? -1 : 1;
      }
      return left.id < right.id ? -1 : 1;
    });
}

export function recentActivity(
  entries: TimelineEntry[],
  limit = RECENT_ACTIVITY_LIMIT,
): TimelineEntry[] {
  return entries.slice(0, limit);
}

export function interactionsPerMonth(
  interactions: Interaction[],
  today: string,
): MonthCount[] {
  const counts = new Map<string, number>();
  for (const row of interactions) {
    const key = row.date.slice(0, 7);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const from = today.slice(0, 10);
  const year = Number(from.slice(0, 4));
  const month = Number(from.slice(5, 7));
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 12 + index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }).format(date),
      count: counts.get(key) ?? 0,
    };
  });
}

export function peoplePerCircle(
  people: PersonComputed[],
  today: string,
): CircleCounts[] {
  const current = people.map((person) => withTodayStatus(person, today));
  return CIRCLES.map((circle) => {
    const inCircle = current.filter((person) => person.circle === circle);
    const count = (status: CheckInStatus) =>
      inCircle.filter((person) => person.status === status).length;
    return {
      circle,
      label: CIRCLE_META[circle].label,
      total: inCircle.length,
      inTouch: count("in_touch"),
      dueSoon: count("due_soon"),
      overdue: count("overdue"),
      snoozed: count("snoozed"),
      off: count("off"),
    };
  });
}

export function buildDashboard(
  people: PersonComputed[],
  dates: ImportantDate[],
  reminders: Reminder[],
  interactions: Interaction[],
  news: NewsItem[],
  today: string,
): RolodexDashboard {
  const names = new Map(people.map((person) => [person.id, person.name]));
  const timeline = buildTimeline(people, { interactions, news, reminders });
  return {
    today,
    whoToContact: whoToContact(people, today),
    upcomingDates: upcomingDates(
      dates.map((row) => ({
        ...row,
        personName: names.get(row.personId) ?? "",
      })),
      UPCOMING_WINDOW_DAYS,
      today,
    ),
    dueReminders: dueReminders(reminders, people, today),
    recentActivity: recentActivity(timeline),
    interactionsPerMonth: interactionsPerMonth(interactions, today),
    peoplePerCircle: peoplePerCircle(people, today),
  };
}

export async function getDashboard(
  tenantId: string,
  repo?: RolodexRepository,
  today: string = todayISO(),
): Promise<RolodexDashboard> {
  const [people, dates, reminders, interactions, news] = await Promise.all([
    listPeople(tenantId, repo),
    listImportantDates(tenantId, repo),
    listReminders(tenantId, repo),
    listInteractions(tenantId, repo),
    listNews(tenantId, repo),
  ]);
  return buildDashboard(people, dates, reminders, interactions, news, today);
}
