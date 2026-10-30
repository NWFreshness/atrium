import { connectionViews, type ConnectionView } from "./connections";
import {
  createConnection,
  deleteConnection,
  listConnections,
  listPeople,
  type CreateConnectionInput,
  type RolodexStore,
} from "./queries";

export async function listConnectionViewsIn(
  tenantId: string,
  personId: string,
  repo?: RolodexStore,
): Promise<ConnectionView[]> {
  const [rows, people] = await Promise.all([
    listConnections(tenantId, repo, { personId }),
    listPeople(tenantId, repo),
  ]);
  return connectionViews(personId, rows, people);
}

export async function createConnectionIn(
  tenantId: string,
  input: CreateConnectionInput,
  repo?: RolodexStore,
) {
  return createConnection(tenantId, input, repo);
}

export async function deleteConnectionIn(
  tenantId: string,
  id: string,
  repo?: RolodexStore,
) {
  return deleteConnection(tenantId, id, repo);
}
