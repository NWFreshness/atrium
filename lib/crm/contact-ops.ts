import { InputError } from "../input/result";
import {
  contactCascadePreview,
  createContact,
  deleteContact,
  DuplicateContactEmailError,
  duplicateEmailFailure,
  getContact,
  listContacts,
  updateContact,
  type CascadePreview,
  type CreateContactInput,
  type CrmStore,
  type Contact,
  type ListContactsOpts,
  type UpdateContactInput,
} from "./queries";

export async function listContactsIn(
  tenantId: string,
  input: ListContactsOpts = {},
  repo?: CrmStore,
): Promise<Contact[]> {
  return listContacts(tenantId, repo, {
    q: input.q,
    status: input.status,
    organizationId: input.organizationId,
  });
}

export async function getContactIn(
  tenantId: string,
  id: string,
  repo?: CrmStore,
): Promise<Contact | null> {
  return getContact(tenantId, id, repo);
}

export async function createContactIn(
  tenantId: string,
  input: CreateContactInput,
  repo?: CrmStore,
): Promise<Contact> {
  return createContact(tenantId, input, repo);
}

export async function updateContactIn(
  tenantId: string,
  id: string,
  input: UpdateContactInput,
  repo?: CrmStore,
): Promise<Contact | null> {
  return updateContact(tenantId, id, input, repo);
}

export async function deleteContactIn(
  tenantId: string,
  id: string,
  repo?: CrmStore,
): Promise<Contact | null> {
  return deleteContact(tenantId, id, repo);
}

export async function contactCascadePreviewIn(
  tenantId: string,
  id: string,
  repo?: CrmStore,
): Promise<CascadePreview> {
  return contactCascadePreview(tenantId, id, repo);
}
