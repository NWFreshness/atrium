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
  type RolodexStore,
  type UpdatePersonInput,
} from "./queries";

export async function listPeopleIn(
  tenantId: string,
  input: ListPeopleOpts = {},
  repo?: RolodexStore,
): Promise<PersonComputed[]> {
  return listPeople(tenantId, repo, input);
}

export async function getPersonIn(
  tenantId: string,
  id: string,
  repo?: RolodexStore,
): Promise<PersonComputed | null> {
  return getPerson(tenantId, id, repo);
}

export async function createPersonIn(
  tenantId: string,
  input: CreatePersonInput,
  repo?: RolodexStore,
) {
  return createPerson(tenantId, input, repo);
}

export async function updatePersonIn(
  tenantId: string,
  id: string,
  input: UpdatePersonInput,
  repo?: RolodexStore,
) {
  return updatePerson(tenantId, id, input, repo);
}

export async function deletePersonIn(
  tenantId: string,
  id: string,
  repo?: RolodexStore,
): Promise<boolean> {
  return deletePerson(tenantId, id, repo);
}

export async function movePersonCircleIn(
  tenantId: string,
  id: string,
  circle: Circle,
  repo?: RolodexStore,
) {
  if (!(CIRCLES as readonly string[]).includes(circle)) {
    return null;
  }
  return movePersonCircle(tenantId, id, circle, repo);
}
