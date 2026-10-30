"use server";

import { sessionTenant } from "../tenancy";
import type { Circle } from "./constants";
import {
  type CreatePersonInput,
  type ListPeopleOpts,
  type PersonComputed,
  type UpdatePersonInput,
} from "./queries";

import {
  listPeopleIn,
  getPersonIn,
  createPersonIn,
  updatePersonIn,
  deletePersonIn,
  movePersonCircleIn,
} from "./person-ops";

export async function listPeopleAction(
  opts: ListPeopleOpts = {},
): Promise<PersonComputed[]> {
  return listPeopleIn(await sessionTenant(), opts);
}

export async function getPersonAction(
  id: string,
): Promise<PersonComputed | null> {
  return getPersonIn(await sessionTenant(), id);
}

export async function createPersonAction(input: CreatePersonInput) {
  return createPersonIn(await sessionTenant(), input);
}

export async function updatePersonAction(id: string, input: UpdatePersonInput) {
  return updatePersonIn(await sessionTenant(), id, input);
}

export async function deletePersonAction(id: string): Promise<boolean> {
  return deletePersonIn(await sessionTenant(), id);
}

export async function movePersonCircleAction(id: string, circle: Circle) {
  return movePersonCircleIn(await sessionTenant(), id, circle);
}
