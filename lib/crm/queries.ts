import type { WriteOpts } from "../db/batch-transaction";
import { assertText, MAX_LONG_TEXT, MAX_SHORT_TEXT } from "../input/text";
import { STAGE_PROBABILITY } from "./constants";
import {
  deleteActivityInDrizzle,
  deleteContactInDrizzle,
  deleteDealInDrizzle,
  deleteOrganizationInDrizzle,
  getActivityInDrizzle,
  getContactInDrizzle,
  getDealInDrizzle,
  getOrganizationInDrizzle,
  insertActivity,
  insertContact,
  insertDeal,
  insertOrganization,
  listActivitiesInDrizzle,
  listContactsInDrizzle,
  listDealsInDrizzle,
  listOrganizationsInDrizzle,
  nextBoardOrderInDrizzle,
  updateActivityInDrizzle,
  updateContactInDrizzle,
  updateDealInDrizzle,
  updateOrganizationInDrizzle,
} from "./queries-drizzle";
import {
  createActivityInMemory,
  createContactInMemory,
  createDealInMemory,
  createOrganizationInMemory,
  deleteActivityInMemory,
  deleteContactInMemory,
  deleteDealInMemory,
  deleteOrganizationInMemory,
  getActivityInMemory,
  getContactInMemory,
  getDealInMemory,
  getOrganizationInMemory,
  listActivitiesInMemory,
  listContactsInMemory,
  listDealsInMemory,
  listOrganizationsInMemory,
  nextBoardOrderInMemory,
  updateActivityInMemory,
  updateContactInMemory,
  updateDealInMemory,
  updateOrganizationInMemory,
} from "./queries-memory";
import {
  type Activity,
  type Contact,
  type CrmRepository,
  type CreateActivityInput,
  type CreateContactInput,
  type CreateDealInput,
  type CreateOrganizationInput,
  type Deal,
  type ListActivitiesOpts,
  type ListContactsOpts,
  type ListDealsOpts,
  type Organization,
  type UpdateActivityInput,
  type UpdateContactInput,
  type UpdateDealInput,
  type UpdateOrganizationInput,
  newId,
  now,
  requireTenantId,
} from "./queries-shared";

export type {
  Activity,
  Contact,
  CrmRepository,
  CreateActivityInput,
  CreateContactInput,
  CreateDealInput,
  CreateOrganizationInput,
  Deal,
  ListActivitiesOpts,
  ListContactsOpts,
  ListDealsOpts,
  Organization,
  UpdateActivityInput,
  UpdateContactInput,
  UpdateDealInput,
  UpdateOrganizationInput,
} from "./queries-shared";
export { createMemoryCrmRepository } from "./queries-memory";

function short(value: unknown) {
  return assertText(value, MAX_SHORT_TEXT);
}

function long(value: unknown) {
  return assertText(value, MAX_LONG_TEXT);
}

export async function listOrganizations(
  tenantId: string,
  repo?: CrmRepository,
  q?: string,
): Promise<Organization[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return listOrganizationsInMemory(repo, scoped, q);
  }
  return listOrganizationsInDrizzle(scoped, q);
}

export async function getOrganization(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return getOrganizationInMemory(repo, scoped, id);
  }
  return getOrganizationInDrizzle(scoped, id);
}

export async function createOrganization(
  tenantId: string,
  input: CreateOrganizationInput,
  repo?: CrmRepository,
  opts?: WriteOpts,
): Promise<Organization> {
  const scoped = requireTenantId(tenantId);
  const row: Organization = {
    id: newId(),
    tenantId: scoped,
    name: short(input.name) as string,
    website: short(input.website ?? null) ?? null,
    industry: short(input.industry ?? null) ?? null,
    notes: long(input.notes ?? null) ?? null,
    createdAt: now(),
  };
  if (repo) {
    return createOrganizationInMemory(repo, row);
  }
  return insertOrganization(row, opts);
}

export async function updateOrganization(
  tenantId: string,
  id: string,
  input: UpdateOrganizationInput,
  repo?: CrmRepository,
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  if (input.name !== undefined) short(input.name);
  if (input.website !== undefined) short(input.website);
  if (input.industry !== undefined) short(input.industry);
  if (input.notes !== undefined) long(input.notes);
  if (repo) {
    return updateOrganizationInMemory(repo, scoped, id, input);
  }
  return updateOrganizationInDrizzle(scoped, id, input);
}

export async function deleteOrganization(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return deleteOrganizationInMemory(repo, scoped, id);
  }
  return deleteOrganizationInDrizzle(scoped, id);
}

export async function listContacts(
  tenantId: string,
  repo?: CrmRepository,
  opts?: ListContactsOpts,
): Promise<Contact[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return listContactsInMemory(repo, scoped, opts);
  }
  return listContactsInDrizzle(scoped, opts);
}

export async function getContact(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return getContactInMemory(repo, scoped, id);
  }
  return getContactInDrizzle(scoped, id);
}

export async function createContact(
  tenantId: string,
  input: CreateContactInput,
  repo?: CrmRepository,
  opts?: WriteOpts,
): Promise<Contact> {
  const scoped = requireTenantId(tenantId);
  const row: Contact = {
    id: newId(),
    tenantId: scoped,
    name: short(input.name) as string,
    email: short(input.email ?? null) ?? null,
    phone: short(input.phone ?? null) ?? null,
    jobTitle: short(input.jobTitle ?? null) ?? null,
    organizationId: input.organizationId ?? null,
    status: input.status,
    createdAt: now(),
  };
  if (repo) {
    return createContactInMemory(repo, row);
  }
  return insertContact(row, opts);
}

export async function updateContact(
  tenantId: string,
  id: string,
  input: UpdateContactInput,
  repo?: CrmRepository,
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  if (input.name !== undefined) short(input.name);
  if (input.email !== undefined) short(input.email);
  if (input.phone !== undefined) short(input.phone);
  if (input.jobTitle !== undefined) short(input.jobTitle);
  if (repo) {
    return updateContactInMemory(repo, scoped, id, input);
  }
  return updateContactInDrizzle(scoped, id, input);
}

export async function deleteContact(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return deleteContactInMemory(repo, scoped, id);
  }
  return deleteContactInDrizzle(scoped, id);
}

export async function listDeals(
  tenantId: string,
  repo?: CrmRepository,
  opts?: ListDealsOpts,
): Promise<Deal[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return listDealsInMemory(repo, scoped, opts);
  }
  return listDealsInDrizzle(scoped, opts);
}

export async function getDeal(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return getDealInMemory(repo, scoped, id);
  }
  return getDealInDrizzle(scoped, id);
}

/**
 * A batched write cannot look a default up: the rows it is about to replace are
 * still there (the wipe travels in the same batch) and there is no database
 * handle to ask, so a caller collecting statements has to bring its own value.
 * The guard is here, before the row is built, so no `max(...)` read is even
 * reachable while a batch is open.
 */

export async function createDeal(
  tenantId: string,
  input: CreateDealInput,
  repo?: CrmRepository,
  opts?: WriteOpts,
): Promise<Deal> {
  const scoped = requireTenantId(tenantId);
  if (opts?.batch && input.boardOrder === undefined) {
    throw new Error(
      "createDeal needs an explicit `boardOrder` when its writes are collected into a batch",
    );
  }
  const row: Deal = {
    id: newId(),
    tenantId: scoped,
    name: short(input.name) as string,
    organizationId: input.organizationId ?? null,
    contactId: input.contactId ?? null,
    stage: input.stage,
    value: input.value,
    probability: input.probability ?? STAGE_PROBABILITY[input.stage],
    closeDate: input.closeDate ?? null,
    boardOrder:
      input.boardOrder ??
      (repo
        ? nextBoardOrderInMemory(repo, scoped, input.stage)
        : await nextBoardOrderInDrizzle(scoped, input.stage)),
    createdAt: now(),
  };
  if (repo) {
    return createDealInMemory(repo, row);
  }
  return insertDeal(row, opts);
}

export async function updateDeal(
  tenantId: string,
  id: string,
  input: UpdateDealInput,
  repo?: CrmRepository,
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  if (input.name !== undefined) short(input.name);
  if (repo) {
    return updateDealInMemory(repo, scoped, id, input);
  }
  return updateDealInDrizzle(scoped, id, input);
}

export async function deleteDeal(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return deleteDealInMemory(repo, scoped, id);
  }
  return deleteDealInDrizzle(scoped, id);
}

export async function listActivities(
  tenantId: string,
  repo?: CrmRepository,
  opts?: ListActivitiesOpts,
): Promise<Activity[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return listActivitiesInMemory(repo, scoped, opts);
  }
  return listActivitiesInDrizzle(scoped, opts);
}

export async function getActivity(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return getActivityInMemory(repo, scoped, id);
  }
  return getActivityInDrizzle(scoped, id);
}

export async function createActivity(
  tenantId: string,
  input: CreateActivityInput,
  repo?: CrmRepository,
  opts?: WriteOpts,
): Promise<Activity> {
  const scoped = requireTenantId(tenantId);
  const row: Activity = {
    id: newId(),
    tenantId: scoped,
    type: input.type,
    contactId: input.contactId ?? null,
    dealId: input.dealId ?? null,
    description: long(input.description) as string,
    occurredAt: input.occurredAt ?? null,
    dueDate: input.dueDate ?? null,
    done: input.done,
    createdAt: now(),
  };
  if (repo) {
    return createActivityInMemory(repo, row);
  }
  return insertActivity(row, opts);
}

export async function updateActivity(
  tenantId: string,
  id: string,
  input: UpdateActivityInput,
  repo?: CrmRepository,
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  if (input.description !== undefined) long(input.description);
  if (repo) {
    return updateActivityInMemory(repo, scoped, id, input);
  }
  return updateActivityInDrizzle(scoped, id, input);
}

export async function deleteActivity(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return deleteActivityInMemory(repo, scoped, id);
  }
  return deleteActivityInDrizzle(scoped, id);
}
