import type { InteractionType } from "./constants";
import type { Interaction, NewsItem, Person, Reminder } from "./queries";

export type TimelineKind = "interaction" | "news" | "reminder_done";

export type TimelineEntry = {
  id: string;
  personId: string;
  personName: string;
  kind: TimelineKind;
  interactionType: InteractionType | null;
  date: string;
  text: string;
};

export type TimelineOpts = {
  personId?: string;
  kind?: TimelineKind;
};

export function buildTimeline(
  people: Pick<Person, "id" | "name">[],
  items: {
    interactions: Interaction[];
    news: NewsItem[];
    reminders: Reminder[];
  },
  opts: TimelineOpts = {},
): TimelineEntry[] {
  const names = new Map(people.map((person) => [person.id, person.name]));
  const entries: TimelineEntry[] = [];

  for (const row of items.interactions) {
    entries.push({
      id: `interaction:${row.id}`,
      personId: row.personId,
      personName: names.get(row.personId) ?? "",
      kind: "interaction",
      interactionType: row.type,
      date: row.date,
      text: row.notes ?? row.type,
    });
  }
  for (const row of items.news) {
    entries.push({
      id: `news:${row.id}`,
      personId: row.personId,
      personName: names.get(row.personId) ?? "",
      kind: "news",
      interactionType: null,
      date: row.date,
      text: row.text,
    });
  }
  for (const row of items.reminders) {
    if (!row.done) {
      continue;
    }
    entries.push({
      id: `reminder:${row.id}`,
      personId: row.personId,
      personName: names.get(row.personId) ?? "",
      kind: "reminder_done",
      interactionType: null,
      date: row.doneAt ?? row.dueDate,
      text: row.text,
    });
  }

  return entries
    .filter((entry) => !opts.personId || entry.personId === opts.personId)
    .filter((entry) => !opts.kind || entry.kind === opts.kind)
    .sort((left, right) => {
      if (left.date !== right.date) {
        return left.date < right.date ? 1 : -1;
      }
      return left.id < right.id ? 1 : -1;
    });
}
