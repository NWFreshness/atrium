"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { CONNECTION_KINDS, type ConnectionKind } from "./constants";
import { connectionViews, type ConnectionView } from "./connections";
import {
  createConnection,
  deleteConnection,
  getPerson,
  listConnections,
  listPeople,
  type CreateConnectionInput,
  type RolodexRepository,
} from "./queries";

type ClientTenantInput = { tenantId?: string };

function isConnectionKind(value: unknown): value is ConnectionKind {
  return (
    typeof value === "string" &&
    (CONNECTION_KINDS as readonly string[]).includes(value)
  );
}

export async function listConnectionViewsForSession(
  getSession: GetSession,
  personId: string,
  repo?: RolodexRepository,
): Promise<ConnectionView[]> {
  const { tenantId } = await requireTenant(getSession);
  const [rows, people] = await Promise.all([
    listConnections(tenantId, repo, { personId }),
    listPeople(tenantId, repo),
  ]);
  return connectionViews(personId, rows, people);
}

export async function createConnectionForSession(
  getSession: GetSession,
  input: CreateConnectionInput & ClientTenantInput,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  if (!isConnectionKind(input.kind)) {
    throw new Error("Invalid connection kind");
  }
  if (input.personA === input.personB) {
    throw new Error("Cannot connect a person to themselves");
  }
  const [a, b] = await Promise.all([
    getPerson(tenantId, input.personA, repo),
    getPerson(tenantId, input.personB, repo),
  ]);
  if (!a || !b) {
    throw new Error("Person not found");
  }
  return createConnection(tenantId, input, repo);
}

export async function deleteConnectionForSession(
  getSession: GetSession,
  id: string,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession);
  return deleteConnection(tenantId, id, repo);
}

export async function listConnectionViewsAction(
  personId: string,
): Promise<ConnectionView[]> {
  const { auth } = await import("@/auth");
  return listConnectionViewsForSession(auth, personId);
}

export async function createConnectionAction(input: CreateConnectionInput) {
  const { auth } = await import("@/auth");
  return createConnectionForSession(auth, input);
}

export async function deleteConnectionAction(id: string) {
  const { auth } = await import("@/auth");
  return deleteConnectionForSession(auth, id);
}
