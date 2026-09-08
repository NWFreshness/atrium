"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { CONTACT_STATUSES, type ContactStatus } from "./constants";
import {
  createContact,
  deleteContact,
  getContact,
  getOrganization,
  listContacts,
  updateContact,
  type CreateContactInput,
  type CrmRepository,
  type Contact,
  type ListContactsOpts,
  type UpdateContactInput,
} from "./queries";

type ClientTenantInput = {
  tenantId?: string;
};

function isContactStatus(value: unknown): value is ContactStatus {
  return (
    typeof value === "string" &&
    (CONTACT_STATUSES as readonly string[]).includes(value)
  );
}

async function requireSessionOrganization(
  tenantId: string,
  organizationId: string | null | undefined,
  repo?: CrmRepository,
): Promise<boolean> {
  if (!organizationId) {
    return true;
  }
  const org = await getOrganization(tenantId, organizationId, repo);
  return org !== null;
}

export async function listContactsForSession(
  getSession: GetSession,
  input: ListContactsOpts & ClientTenantInput = {},
  repo?: CrmRepository,
): Promise<Contact[]> {
  const { tenantId } = await requireTenant(getSession, input);
  return listContacts(tenantId, repo, {
    q: input.q,
    status: input.status,
    organizationId: input.organizationId,
  });
}

export async function getContactForSession(
  getSession: GetSession,
  id: string,
  repo?: CrmRepository,
): Promise<Contact | null> {
  const { tenantId } = await requireTenant(getSession);
  return getContact(tenantId, id, repo);
}

export async function createContactForSession(
  getSession: GetSession,
  input: CreateContactInput & ClientTenantInput,
  repo?: CrmRepository,
): Promise<Contact | null> {
  const { tenantId } = await requireTenant(getSession, input);
  if (!isContactStatus(input.status)) {
    return null;
  }
  if (
    !(await requireSessionOrganization(tenantId, input.organizationId, repo))
  ) {
    return null;
  }
  return createContact(tenantId, input, repo);
}

export async function updateContactForSession(
  getSession: GetSession,
  id: string,
  input: UpdateContactInput & ClientTenantInput,
  repo?: CrmRepository,
): Promise<Contact | null> {
  const { tenantId } = await requireTenant(getSession, input);
  if (input.status !== undefined && !isContactStatus(input.status)) {
    return null;
  }
  if (
    input.organizationId !== undefined &&
    !(await requireSessionOrganization(tenantId, input.organizationId, repo))
  ) {
    return null;
  }
  return updateContact(tenantId, id, input, repo);
}

export async function deleteContactForSession(
  getSession: GetSession,
  id: string,
  repo?: CrmRepository,
): Promise<Contact | null> {
  const { tenantId } = await requireTenant(getSession);
  return deleteContact(tenantId, id, repo);
}

export async function listContactsAction(
  opts?: ListContactsOpts,
): Promise<Contact[]> {
  const { auth } = await import("@/auth");
  return listContactsForSession(auth, opts ?? {});
}

export async function getContactAction(id: string): Promise<Contact | null> {
  const { auth } = await import("@/auth");
  return getContactForSession(auth, id);
}

export async function createContactAction(
  input: CreateContactInput,
): Promise<Contact | null> {
  const { auth } = await import("@/auth");
  return createContactForSession(auth, input);
}

export async function updateContactAction(
  id: string,
  input: UpdateContactInput,
): Promise<Contact | null> {
  const { auth } = await import("@/auth");
  return updateContactForSession(auth, id, input);
}

export async function deleteContactAction(id: string): Promise<Contact | null> {
  const { auth } = await import("@/auth");
  return deleteContactForSession(auth, id);
}
