import type { InteractionType } from "./constants";
import { todayISO } from "./dates";
import {
  createFact,
  createInteraction,
  createNews,
  createReminder,
  getReminder,
  listFacts,
  listInteractions,
  listNews,
  listPeople,
  listReminders,
  updateReminder,
  type RolodexStore,
} from "./queries";
import {
  buildTimeline,
  type TimelineEntry,
  type TimelineOpts,
} from "./timeline";

export async function createInteractionIn(
  tenantId: string,
  input: {
    personId: string;
    type: InteractionType;
    date?: string;
    notes?: string | null;
  },
  repo?: RolodexStore,
) {
  return createInteraction(
    tenantId,
    {
      personId: input.personId,
      type: input.type,
      date: input.date ?? todayISO(),
      notes: input.notes,
    },
    repo,
  );
}

export async function createFactIn(
  tenantId: string,
  input: { personId: string; text: string },
  repo?: RolodexStore,
) {
  return createFact(tenantId, input, repo);
}

export async function createNewsIn(
  tenantId: string,
  input: { personId: string; text: string; date?: string },
  repo?: RolodexStore,
) {
  return createNews(
    tenantId,
    { ...input, date: input.date ?? todayISO() },
    repo,
  );
}

export async function createReminderIn(
  tenantId: string,
  input: {
    personId: string;
    text: string;
    dueDate: string;
  },
  repo?: RolodexStore,
) {
  return createReminder(tenantId, input, repo);
}

export async function toggleReminderDoneIn(
  tenantId: string,
  id: string,
  done: boolean,
  repo?: RolodexStore,
) {
  const existing = await getReminder(tenantId, id, repo);
  if (!existing) {
    return null;
  }
  return updateReminder(
    tenantId,
    id,
    { done, doneAt: done ? todayISO() : null },
    repo,
  );
}

export async function listTimelineIn(
  tenantId: string,
  input: TimelineOpts = {},
  repo?: RolodexStore,
): Promise<TimelineEntry[]> {
  const [people, interactions, news, reminders] = await Promise.all([
    listPeople(tenantId, repo),
    listInteractions(tenantId, repo),
    listNews(tenantId, repo),
    listReminders(tenantId, repo),
  ]);
  return buildTimeline(people, { interactions, news, reminders }, input);
}

export async function listPersonLogIn(
  tenantId: string,
  personId: string,
  repo?: RolodexStore,
) {
  const [facts, reminders, timeline] = await Promise.all([
    listFacts(tenantId, repo, { personId }),
    listReminders(tenantId, repo, { personId }),
    listTimelineIn(tenantId, { personId }, repo),
  ]);
  return { facts, reminders, timeline };
}
