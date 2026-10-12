"use server";

import { toResult, type ActionResult } from "../input/result";
import { sessionTenant } from "../tenancy";
import {
  type CascadePreview,
  type CreateContactInput,
  type Contact,
  type ListContactsOpts,
  type UpdateContactInput,
  duplicateEmailFailure,
  type ContactResult,
} from "./queries";

import {
  listContactsIn,
  getContactIn,
  createContactIn,
  updateContactIn,
  deleteContactIn,
  contactCascadePreviewIn,
} from "./contact-ops";
export type { DuplicateEmailFailure, TakenContactRef } from "./queries";

export async function listContactsAction(
  opts?: ListContactsOpts,
): Promise<Contact[]> {
  return listContactsIn(await sessionTenant(), opts ?? {});
}

export async function getContactAction(id: string): Promise<Contact | null> {
  return getContactIn(await sessionTenant(), id);
}

export async function createContactAction(
  input: CreateContactInput,
): Promise<ContactResult> {
  return toResult(
    async () => createContactIn(await sessionTenant(), input),
    duplicateEmailFailure,
  );
}

export async function updateContactAction(
  id: string,
  input: UpdateContactInput,
): Promise<ContactResult> {
  return toResult(
    async () => updateContactIn(await sessionTenant(), id, input),
    duplicateEmailFailure,
  );
}

export async function deleteContactAction(
  id: string,
): Promise<ActionResult<Contact>> {
  return toResult(async () => deleteContactIn(await sessionTenant(), id));
}

export async function contactCascadePreviewAction(
  id: string,
): Promise<CascadePreview> {
  return contactCascadePreviewIn(await sessionTenant(), id);
}
