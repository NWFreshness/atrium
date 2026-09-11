import type { Circle } from "./constants";
import {
  getPerson,
  updatePerson,
  type PersonComputed,
  type RolodexRepository,
} from "./queries";

export async function movePersonCircle(
  tenantId: string,
  id: string,
  circle: Circle,
  repo?: RolodexRepository,
): Promise<PersonComputed | null> {
  const person = await getPerson(tenantId, id, repo);
  if (!person) {
    return null;
  }
  if (person.circle === circle) {
    return person;
  }
  await updatePerson(tenantId, id, { circle }, repo);
  return getPerson(tenantId, id, repo);
}
