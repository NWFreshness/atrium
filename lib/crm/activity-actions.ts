"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { ACTIVITY_TYPES, type ActivityType } from "./constants";
import {
  createActivity,
  getActivity,
  getContact,
  getDeal,
  listActivities,
  updateActivity,
  type Activity,
  type CreateActivityInput,
  type CrmRepository,
  type ListActivitiesOpts,
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
