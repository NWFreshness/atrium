"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { ACTIVITY_TYPES, type ActivityType } from "./constants";
import {
  createActivity,
  deleteActivity,
  getActivity,
  getContact,
  getDeal,
  listActivities,
  updateActivity,
  type Activity,
  type CreateActivityInput,
  type CrmRepository,
  type ListActivitiesOpts,
  type UpdateActivityInput,
} from "./queries";

type ClientTenantInput = {
  tenantId?: string;
};

type CreateActivitySessionInput = Omit<CreateActivityInput, "done"> & {
  done?: boolean;
} & ClientTenantInput;

function isActivityType(value: unknown): value is ActivityType {
  return (
    typeof value === "string" &&
    (ACTIVITY_TYPES as readonly string[]).includes(value)
  );
}

async function requireSessionContact(
  tenantId: string,
  contactId: string | null | undefined,
  repo?: CrmRepository,
): Promise<boolean> {
  if (!contactId) {
    return true;
  }
  const contact = await getContact(tenantId, contactId, repo);
  return contact !== null;
}

async function requireSessionDeal(
  tenantId: string,
  dealId: string | null | undefined,
  repo?: CrmRepository,
): Promise<boolean> {
  if (!dealId) {
    return true;
  }
  const deal = await getDeal(tenantId, dealId, repo);
  return deal !== null;
}

export async function listActivitiesForSession(
  getSession: GetSession,
  input: ListActivitiesOpts & ClientTenantInput = {},
  repo?: CrmRepository,
): Promise<Activity[]> {
  const { tenantId } = await requireTenant(getSession, input);
  return listActivities(tenantId, repo, {
    contactId: input.contactId,
    dealId: input.dealId,
  });
}

export async function getActivityForSession(
  getSession: GetSession,
  id: string,
  repo?: CrmRepository,
): Promise<Activity | null> {
  const { tenantId } = await requireTenant(getSession);
  return getActivity(tenantId, id, repo);
}

export async function createActivityForSession(
  getSession: GetSession,
  input: CreateActivitySessionInput,
  repo?: CrmRepository,
): Promise<Activity | null> {
  const { tenantId } = await requireTenant(getSession, input);
  const description = input.description.trim();
  if (!description) {
    return null;
  }
  if (!isActivityType(input.type)) {
    return null;
  }
  if (!(await requireSessionContact(tenantId, input.contactId, repo))) {
    return null;
  }
  if (!(await requireSessionDeal(tenantId, input.dealId, repo))) {
    return null;
  }
  return createActivity(
    tenantId,
    {
      ...input,
      description,
      done: input.done ?? false,
      occurredAt:
        input.occurredAt !== undefined ? input.occurredAt : new Date(),
    },
    repo,
  );
}

export async function toggleActivityDoneForSession(
  getSession: GetSession,
  id: string,
  done: boolean,
  repo?: CrmRepository,
): Promise<Activity | null> {
  const { tenantId } = await requireTenant(getSession);
  const existing = await getActivity(tenantId, id, repo);
  if (!existing) {
    return null;
  }
  return updateActivity(tenantId, id, { done }, repo);
}

type UpdateActivitySessionInput = UpdateActivityInput;

/**
 * Update an activity under the session's tenant. Returns `null` for any of:
 *  - a different tenant's id (the existing `getActivity` miss-check),
 *  - an unknown activity type (e.g. a value the constants module does not list),
 *  - a `null` from the underlying `updateActivity` (row gone between read and write).
 *
 * The unknown-type check is between the miss-check and the dispatch so that a
 * bad value cannot reach the update path even if the row exists. Note the
 * signature does NOT pass `input` to `requireTenant` — the session's
 * `tenantId` is the only source of the scoping key. See `requireTenant`.
 */
export async function updateActivityForSession(
  getSession: GetSession,
  id: string,
  input: UpdateActivitySessionInput,
  repo?: CrmRepository,
): Promise<Activity | null> {
  const { tenantId } = await requireTenant(getSession);
  const existing = await getActivity(tenantId, id, repo);
  if (!existing) {
    return null;
  }
  if (!isActivityType(input.type ?? existing.type)) {
    return null;
  }
  return updateActivity(tenantId, id, input, repo);
}

export async function deleteActivityForSession(
  getSession: GetSession,
  id: string,
  repo?: CrmRepository,
): Promise<Activity | null> {
  const { tenantId } = await requireTenant(getSession);
  return deleteActivity(tenantId, id, repo);
}

export async function listActivitiesAction(
  opts?: ListActivitiesOpts,
): Promise<Activity[]> {
  const { auth } = await import("@/auth");
  return listActivitiesForSession(auth, opts ?? {});
}

export async function getActivityAction(id: string): Promise<Activity | null> {
  const { auth } = await import("@/auth");
  return getActivityForSession(auth, id);
}

export async function createActivityAction(
  input: CreateActivitySessionInput,
): Promise<Activity | null> {
  const { auth } = await import("@/auth");
  return createActivityForSession(auth, input);
}

export async function toggleActivityDoneAction(
  id: string,
  done: boolean,
): Promise<Activity | null> {
  const { auth } = await import("@/auth");
  return toggleActivityDoneForSession(auth, id, done);
}

export async function updateActivityAction(
  id: string,
  input: UpdateActivityInput,
): Promise<Activity | null> {
  const { auth } = await import("@/auth");
  return updateActivityForSession(auth, id, input);
}

export async function deleteActivityAction(
  id: string,
): Promise<Activity | null> {
  const { auth } = await import("@/auth");
  return deleteActivityForSession(auth, id);
}
