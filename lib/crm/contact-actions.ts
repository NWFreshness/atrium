"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { CONTACT_STATUSES, type ContactStatus } from "./constants";
import {
  contactCascadePreview,
  createContact,
  deleteContact,
  DuplicateContactEmailError,
  duplicateEmailFailure,
  getContact,
  getOrganization,
  listContacts,
  updateContact,
  type CascadePreview,
  type ContactCreateResult,
  type ContactUpdateResult,
  type CreateContactInput,
  type CrmRepository,
  type Contact,
  type ListContactsOpts,
  type UpdateContactInput,
} from "./queries";

export type {
  ContactCreateResult,
  ContactUpdateResult,
  DuplicateEmailFailure,
  TakenContactRef,
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
): Promise<ContactCreateResult | null> {
  const { tenantId } = await requireTenant(getSession, input);
  if (!isContactStatus(input.status)) {
    return null;
  }
  if (
    !(await requireSessionOrganization(tenantId, input.organizationId, repo))
  ) {
    return null;
  }
  try {
    const contact = await createContact(tenantId, input, repo);
    return { ok: true, contact };
  } catch (error) {
    if (error instanceof DuplicateContactEmailError) {
      return duplicateEmailFailure(error);
    }
    throw error;
  }
}

export async function updateContactForSession(
  getSession: GetSession,
  id: string,
  input: UpdateContactInput & ClientTenantInput,
  repo?: CrmRepository,
): Promise<ContactUpdateResult | null> {
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
  try {
    const contact = await updateContact(tenantId, id, input, repo);
    if (!contact) {
      return null;
    }
    return { ok: true, contact };
  } catch (error) {
    if (error instanceof DuplicateContactEmailError) {
      return duplicateEmailFailure(error);
    }
    throw error;
  }
}

export async function deleteContactForSession(
  getSession: GetSession,
  id: string,
  repo?: CrmRepository,
): Promise<Contact | null> {
  const { tenantId } = await requireTenant(getSession);
  return deleteContact(tenantId, id, repo);
}

export async function contactCascadePreviewForSession(
  getSession: GetSession,
  id: string,
  repo?: CrmRepository,
): Promise<CascadePreview> {
  const { tenantId } = await requireTenant(getSession);
  return contactCascadePreview(tenantId, id, repo);
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
): Promise<ContactCreateResult | null> {
  const { auth } = await import("@/auth");
  return createContactForSession(auth, input);
}

export async function updateContactAction(
  id: string,
  input: UpdateContactInput,
): Promise<ContactUpdateResult | null> {
  const { auth } = await import("@/auth");
  return updateContactForSession(auth, id, input);
}

export async function deleteContactAction(id: string): Promise<Contact | null> {
  const { auth } = await import("@/auth");
  return deleteContactForSession(auth, id);
}

export async function contactCascadePreviewAction(
  id: string,
): Promise<CascadePreview> {
  const { auth } = await import("@/auth");
  return contactCascadePreviewForSession(auth, id);
}
