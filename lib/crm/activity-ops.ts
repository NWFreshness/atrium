import { InputError } from "../input/result";
import {
  createActivity,
  deleteActivity,
  getActivity,
  listActivities,
  updateActivity,
  type Activity,
  type CreateActivityInput,
  type CrmStore,
  type ListActivitiesOpts,
  type UpdateActivityInput,
} from "./queries";

export type NewActivityInput = Omit<CreateActivityInput, "done"> & {
  done?: boolean;
};

export async function listActivitiesIn(
  tenantId: string,
  input: ListActivitiesOpts = {},
  repo?: CrmStore,
): Promise<Activity[]> {
  return listActivities(tenantId, repo, {
    contactId: input.contactId,
    dealId: input.dealId,
  });
}

export async function getActivityIn(
  tenantId: string,
  id: string,
  repo?: CrmStore,
): Promise<Activity | null> {
  return getActivity(tenantId, id, repo);
}

export async function createActivityIn(
  tenantId: string,
  input: NewActivityInput,
  repo?: CrmStore,
): Promise<Activity | null> {
  const description = input.description.trim();
  if (!description) {
    throw new InputError("description");
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

export async function toggleActivityDoneIn(
  tenantId: string,
  id: string,
  done: boolean,
  repo?: CrmStore,
): Promise<Activity | null> {
  const existing = await getActivity(tenantId, id, repo);
  if (!existing) {
    return null;
  }
  return updateActivity(tenantId, id, { done }, repo);
}

/**
 * Update an activity under the session's tenant. Returns `null` for any of:
 *  - a different tenant's id (the existing `getActivity` miss-check),
 *  - an unknown activity type (e.g. a value the constants module does not list),
 *  - a `null` from the underlying `updateActivity` (row gone between read and write).
 *
 * The unknown-type check is between the miss-check and the dispatch so that a
 * bad value cannot reach the update path even if the row exists. `tenantId`
 * is the caller's session tenant; `input` has no way to name another one.
 */
export async function updateActivityIn(
  tenantId: string,
  id: string,
  input: UpdateActivityInput,
  repo?: CrmStore,
): Promise<Activity | null> {
  const existing = await getActivity(tenantId, id, repo);
  if (!existing) {
    return null;
  }
  return updateActivity(tenantId, id, input, repo);
}

export async function deleteActivityIn(
  tenantId: string,
  id: string,
  repo?: CrmStore,
): Promise<Activity | null> {
  return deleteActivity(tenantId, id, repo);
}
