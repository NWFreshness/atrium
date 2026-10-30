"use server";

import { toResult, type ActionResult } from "../input/result";
import { sessionTenant } from "../tenancy";
import {
  type Activity,
  type ListActivitiesOpts,
  type UpdateActivityInput,
} from "./queries";

import {
  type NewActivityInput,
  listActivitiesIn,
  getActivityIn,
  createActivityIn,
  toggleActivityDoneIn,
  updateActivityIn,
  deleteActivityIn,
} from "./activity-ops";

export async function listActivitiesAction(
  opts?: ListActivitiesOpts,
): Promise<Activity[]> {
  return listActivitiesIn(await sessionTenant(), opts ?? {});
}

export async function getActivityAction(id: string): Promise<Activity | null> {
  return getActivityIn(await sessionTenant(), id);
}

export async function createActivityAction(
  input: NewActivityInput,
): Promise<ActionResult<Activity>> {
  return toResult(async () => createActivityIn(await sessionTenant(), input));
}

export async function toggleActivityDoneAction(
  id: string,
  done: boolean,
): Promise<ActionResult<Activity>> {
  return toResult(async () =>
    toggleActivityDoneIn(await sessionTenant(), id, done),
  );
}

export async function updateActivityAction(
  id: string,
  input: UpdateActivityInput,
): Promise<ActionResult<Activity>> {
  return toResult(async () =>
    updateActivityIn(await sessionTenant(), id, input),
  );
}

export async function deleteActivityAction(
  id: string,
): Promise<ActionResult<Activity>> {
  return toResult(async () => deleteActivityIn(await sessionTenant(), id));
}
