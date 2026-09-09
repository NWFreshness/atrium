"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { CIRCLES, type Circle } from "./constants";
import { movePersonCircle } from "./move-person";
import {
  createPerson,
  deletePerson,
  getPerson,
  listPeople,
  updatePerson,
  type CreatePersonInput,
  type ListPeopleOpts,
  type PersonComputed,
  type RolodexRepository,
  type UpdatePersonInput,
} from "./queries";

type ClientTenantInput = {
  tenantId?: string;
};

export async function listPeopleForSession(
  getSession: GetSession,
  input: ListPeopleOpts & ClientTenantInput = {},
  repo?: RolodexRepository,
): Promise<PersonComputed[]> {
  const { tenantId } = await requireTenant(getSession, input);
  return listPeople(tenantId, repo, input);
}

export async function getPersonForSession(
  getSession: GetSession,
  id: string,
  repo?: RolodexRepository,
): Promise<PersonComputed | null> {
  const { tenantId } = await requireTenant(getSession);
  return getPerson(tenantId, id, repo);
}

export async function createPersonForSession(
  getSession: GetSession,
  input: CreatePersonInput & ClientTenantInput,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  return createPerson(tenantId, input, repo);
}

export async function updatePersonForSession(
  getSession: GetSession,
  id: string,
  input: UpdatePersonInput & ClientTenantInput,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  return updatePerson(tenantId, id, input, repo);
}

export async function deletePersonForSession(
  getSession: GetSession,
  id: string,
  repo?: RolodexRepository,
): Promise<boolean> {
  const { tenantId } = await requireTenant(getSession);
  return deletePerson(tenantId, id, repo);
}

export async function listPeopleAction(
  opts: ListPeopleOpts = {},
): Promise<PersonComputed[]> {
  const { auth } = await import("@/auth");
  return listPeopleForSession(auth, opts);
}

export async function getPersonAction(
  id: string,
): Promise<PersonComputed | null> {
  const { auth } = await import("@/auth");
  return getPersonForSession(auth, id);
}

export async function createPersonAction(input: CreatePersonInput) {
  const { auth } = await import("@/auth");
  return createPersonForSession(auth, input);
}

export async function updatePersonAction(id: string, input: UpdatePersonInput) {
  const { auth } = await import("@/auth");
  return updatePersonForSession(auth, id, input);
}

export async function deletePersonAction(id: string): Promise<boolean> {
  const { auth } = await import("@/auth");
  return deletePersonForSession(auth, id);
}

export async function movePersonCircleForSession(
  getSession: GetSession,
  id: string,
  circle: Circle,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession);
  if (!(CIRCLES as readonly string[]).includes(circle)) {
    return null;
  }
  return movePersonCircle(tenantId, id, circle, repo);
}

export async function movePersonCircleAction(id: string, circle: Circle) {
  const { auth } = await import("@/auth");
  return movePersonCircleForSession(auth, id, circle);
}
