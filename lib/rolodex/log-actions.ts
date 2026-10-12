"use server";

import { sessionTenant } from "../tenancy";
import type { InteractionType } from "./constants";
import { type TimelineOpts } from "./timeline";

import {
  createInteractionIn,
  createFactIn,
  createNewsIn,
  createReminderIn,
  toggleReminderDoneIn,
  listTimelineIn,
  listPersonLogIn,
} from "./log-ops";

export async function createInteractionAction(input: {
  personId: string;
  type: InteractionType;
  date?: string;
  notes?: string | null;
}) {
  return createInteractionIn(await sessionTenant(), input);
}

export async function createFactAction(input: {
  personId: string;
  text: string;
}) {
  return createFactIn(await sessionTenant(), input);
}

export async function createNewsAction(input: {
  personId: string;
  text: string;
  date?: string;
}) {
  return createNewsIn(await sessionTenant(), input);
}

export async function createReminderAction(input: {
  personId: string;
  text: string;
  dueDate: string;
}) {
  return createReminderIn(await sessionTenant(), input);
}

export async function toggleReminderDoneAction(id: string, done: boolean) {
  return toggleReminderDoneIn(await sessionTenant(), id, done);
}

export async function listTimelineAction(opts: TimelineOpts = {}) {
  return listTimelineIn(await sessionTenant(), opts);
}

export async function listPersonLogAction(personId: string) {
  return listPersonLogIn(await sessionTenant(), personId);
}
