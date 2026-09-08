import { requireTenant, type GetSession } from "../tenancy";
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  listOrganizations,
  updateOrganization,
  type CreateOrganizationInput,
  type CrmRepository,
  type Organization,
  type UpdateOrganizationInput,
} from "./queries";

type ClientTenantInput = {
  tenantId?: string;
};

export async function listOrganizationsForSession(
  getSession: GetSession,
  input: { q?: string } & ClientTenantInput = {},
  repo?: CrmRepository,
): Promise<Organization[]> {
  const { tenantId } = await requireTenant(getSession, input);
  return listOrganizations(tenantId, repo, input.q);
}

export async function getOrganizationForSession(
  getSession: GetSession,
  id: string,
  repo?: CrmRepository,
): Promise<Organization | null> {
  const { tenantId } = await requireTenant(getSession);
  return getOrganization(tenantId, id, repo);
}

export async function createOrganizationForSession(
  getSession: GetSession,
  input: CreateOrganizationInput & ClientTenantInput,
  repo?: CrmRepository,
): Promise<Organization> {
  const { tenantId } = await requireTenant(getSession, input);
  return createOrganization(tenantId, input, repo);
}

export async function updateOrganizationForSession(
  getSession: GetSession,
  id: string,
  input: UpdateOrganizationInput & ClientTenantInput,
  repo?: CrmRepository,
): Promise<Organization | null> {
  const { tenantId } = await requireTenant(getSession, input);
  return updateOrganization(tenantId, id, input, repo);
}

export async function deleteOrganizationForSession(
  getSession: GetSession,
  id: string,
  repo?: CrmRepository,
): Promise<Organization | null> {
  const { tenantId } = await requireTenant(getSession);
  return deleteOrganization(tenantId, id, repo);
}

export async function listOrganizationsAction(
  q?: string,
): Promise<Organization[]> {
  "use server";
  const { auth } = await import("@/auth");
  return listOrganizationsForSession(auth, { q });
}

export async function getOrganizationAction(
  id: string,
): Promise<Organization | null> {
  "use server";
  const { auth } = await import("@/auth");
  return getOrganizationForSession(auth, id);
}

export async function createOrganizationAction(
  input: CreateOrganizationInput,
): Promise<Organization> {
  "use server";
  const { auth } = await import("@/auth");
  return createOrganizationForSession(auth, input);
}

export async function updateOrganizationAction(
  id: string,
  input: UpdateOrganizationInput,
): Promise<Organization | null> {
  "use server";
  const { auth } = await import("@/auth");
  return updateOrganizationForSession(auth, id, input);
}

export async function deleteOrganizationAction(
  id: string,
): Promise<Organization | null> {
  "use server";
  const { auth } = await import("@/auth");
  return deleteOrganizationForSession(auth, id);
}
