"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { INTERACTION_TYPES, type InteractionType } from "./constants";
import { todayISO } from "./dates";
import {
  createFact,
  createInteraction,
  createNews,
  createReminder,
  getPerson,
  getReminder,
  listFacts,
  listInteractions,
  listNews,
  listPeople,
  listReminders,
  updateReminder,
  type RolodexRepository,
} from "./queries";
import {
  buildTimeline,
  type TimelineEntry,
  type TimelineOpts,
} from "./timeline";

type ClientTenantInput = { tenantId?: string };

async function requireSessionPerson(
  tenantId: string,
  personId: string,
  repo?: RolodexRepository,
): Promise<boolean> {
  return (await getPerson(tenantId, personId, repo)) !== null;
}

export async function createInteractionForSession(
  getSession: GetSession,
  input: {
    personId: string;
    type: InteractionType;
    date?: string;
    notes?: string | null;
  } & ClientTenantInput,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  if (!(INTERACTION_TYPES as readonly string[]).includes(input.type)) {
    throw new Error("Invalid interaction type");
  }
  if (!(await requireSessionPerson(tenantId, input.personId, repo))) {
    throw new Error("Person not found");
  }
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

export async function createFactForSession(
  getSession: GetSession,
  input: { personId: string; text: string } & ClientTenantInput,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  if (!(await requireSessionPerson(tenantId, input.personId, repo))) {
    throw new Error("Person not found");
  }
  return createFact(tenantId, input, repo);
}

export async function createNewsForSession(
  getSession: GetSession,
  input: { personId: string; text: string; date?: string } & ClientTenantInput,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  if (!(await requireSessionPerson(tenantId, input.personId, repo))) {
    throw new Error("Person not found");
  }
  return createNews(
    tenantId,
    { ...input, date: input.date ?? todayISO() },
    repo,
  );
}

export async function createReminderForSession(
  getSession: GetSession,
  input: {
    personId: string;
    text: string;
    dueDate: string;
  } & ClientTenantInput,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  if (!(await requireSessionPerson(tenantId, input.personId, repo))) {
    throw new Error("Person not found");
  }
  return createReminder(tenantId, input, repo);
}

export async function toggleReminderDoneForSession(
  getSession: GetSession,
  id: string,
  done: boolean,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession);
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

export async function listTimelineForSession(
  getSession: GetSession,
  input: TimelineOpts & ClientTenantInput = {},
  repo?: RolodexRepository,
): Promise<TimelineEntry[]> {
  const { tenantId } = await requireTenant(getSession, input);
  const [people, interactions, news, reminders] = await Promise.all([
    listPeople(tenantId, repo),
    listInteractions(tenantId, repo),
    listNews(tenantId, repo),
    listReminders(tenantId, repo),
  ]);
  return buildTimeline(people, { interactions, news, reminders }, input);
}

export async function createInteractionAction(input: {
  personId: string;
  type: InteractionType;
  date?: string;
  notes?: string | null;
}) {
  const { auth } = await import("@/auth");
  return createInteractionForSession(auth, input);
}

export async function createFactAction(input: {
  personId: string;
  text: string;
}) {
  const { auth } = await import("@/auth");
  return createFactForSession(auth, input);
}

export async function createNewsAction(input: {
  personId: string;
  text: string;
  date?: string;
}) {
  const { auth } = await import("@/auth");
  return createNewsForSession(auth, input);
}

export async function createReminderAction(input: {
  personId: string;
  text: string;
  dueDate: string;
}) {
  const { auth } = await import("@/auth");
  return createReminderForSession(auth, input);
}

export async function toggleReminderDoneAction(id: string, done: boolean) {
  const { auth } = await import("@/auth");
  return toggleReminderDoneForSession(auth, id, done);
}

export async function listTimelineAction(opts: TimelineOpts = {}) {
  const { auth } = await import("@/auth");
  return listTimelineForSession(auth, opts);
}

export async function listPersonLogAction(personId: string) {
  const { auth } = await import("@/auth");
  const { tenantId } = await requireTenant(auth);
  const [facts, reminders, timeline] = await Promise.all([
    listFacts(tenantId, undefined, { personId }),
    listReminders(tenantId, undefined, { personId }),
    listTimelineForSession(auth, { personId }),
  ]);
  return { facts, reminders, timeline };
}
