import { assertMoney, assertPercent, MAX_MONEY } from "../input/numbers";
import { assertText, MAX_LONG_TEXT, MAX_SHORT_TEXT } from "../input/text";
import { assertOneOf, assertRef, type ActionResult } from "../input/result";
import {
  ACTIVITY_TYPES,
  CONTACT_STATUSES,
  DEAL_STAGES,
  STAGE_PROBABILITY,
} from "./constants";
import { getDb } from "../db";
import { normalizeContactEmail } from "./queries-memory";
import {
  createDrizzleCrmStore,
  type CrmStore,
  type DealPlacement,
} from "./store";
import {
  DuplicateContactEmailError,
  type Activity,
  type CascadePreview,
  type Contact,
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
} from "./queries-shared";
import { requireTenantId } from "../tenancy";

export type {
  Activity,
  CascadePreview,
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
export { DuplicateContactEmailError } from "./queries-shared";
export { createMemoryCrmStore, type CrmStore } from "./store";

/** Production storage. Resolved per call so a test that injects a store never opens a database. */
function defaultStore(): CrmStore {
  if (!process.env.DATABASE_URL) {
    throw new Error("CRM store required");
  }
  return createDrizzleCrmStore(getDb());
}

/** One tenant, one address in any casing. The pre-check names the clash; the unique index settles a race. */
async function assertEmailFree(
  store: CrmStore,
  tenantId: string,
  email: string | null | undefined,
  excludeId?: string,
): Promise<void> {
  if (!email) {
    return;
  }
  const clash = await store.contacts.findByEmail(
    tenantId,
    email.trim().toLowerCase(),
    excludeId,
  );
  if (clash) {
    throw new DuplicateContactEmailError({
      id: clash.id,
      name: clash.name,
      email: clash.email ?? email,
    });
  }
}

/** The contact the address already belongs to — named and linked in the UI. */
export type TakenContactRef = {
  id: string;
  name: string;
  email: string;
};

export type DuplicateEmailFailure = {
  ok: false;
  code: "duplicate_email";
  existing?: TakenContactRef;
};

/** A contact write: the shared outcomes, plus the one refusal contacts add. */
export type ContactResult = ActionResult<Contact> | DuplicateEmailFailure;

/**
 * Maps the store refusal to the typed result; anything else is not ours to
 * map. The pre-check path carries the clashing contact for the link; the race
 * path (a 23505 the pre-check passed) has no `existing` key — the losing write
 * never saw the winner. (Defined here, not in the action module, because
 * `"use server"` files may only export async functions.)
 */
export function duplicateEmailFailure(
  error: unknown,
): DuplicateEmailFailure | undefined {
  if (!(error instanceof DuplicateContactEmailError)) {
    return undefined;
  }
  return error.existing
    ? {
        ok: false,
        code: "duplicate_email",
        existing: error.existing,
      }
    : { ok: false, code: "duplicate_email" };
}

function short(value: unknown) {
  return assertText(value, MAX_SHORT_TEXT);
}

function long(value: unknown) {
  return assertText(value, MAX_LONG_TEXT);
}

export async function listOrganizations(
  tenantId: string,
  store: CrmStore = defaultStore(),
  q?: string,
): Promise<Organization[]> {
  const scoped = requireTenantId(tenantId);
  return store.organizations.list(scoped, q);
}

export async function getOrganization(
  tenantId: string,
  id: string,
  store: CrmStore = defaultStore(),
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  return store.organizations.get(scoped, id);
}

export async function createOrganization(
  tenantId: string,
  input: CreateOrganizationInput,
  store: CrmStore = defaultStore(),
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
  return store.organizations.insert(row);
}

export async function updateOrganization(
  tenantId: string,
  id: string,
  input: UpdateOrganizationInput,
  store: CrmStore = defaultStore(),
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  if (input.name !== undefined) short(input.name);
  if (input.website !== undefined) short(input.website);
  if (input.industry !== undefined) short(input.industry);
  if (input.notes !== undefined) long(input.notes);
  return store.organizations.update(scoped, id, input);
}

export async function deleteOrganization(
  tenantId: string,
  id: string,
  store: CrmStore = defaultStore(),
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  return store.organizations.delete(scoped, id);
}

export async function organizationCascadePreview(
  tenantId: string,
  id: string,
  store: CrmStore = defaultStore(),
): Promise<CascadePreview> {
  const scoped = requireTenantId(tenantId);
  return store.organizations.cascadePreview(scoped, id);
}

export async function listContacts(
  tenantId: string,
  store: CrmStore = defaultStore(),
  opts?: ListContactsOpts,
): Promise<Contact[]> {
  const scoped = requireTenantId(tenantId);
  return store.contacts.list(scoped, opts);
}

export async function getContact(
  tenantId: string,
  id: string,
  store: CrmStore = defaultStore(),
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  return store.contacts.get(scoped, id);
}

export async function createContact(
  tenantId: string,
  input: CreateContactInput,
  store: CrmStore = defaultStore(),
): Promise<Contact> {
  const scoped = requireTenantId(tenantId);
  assertOneOf(CONTACT_STATUSES, input.status, "status");
  await assertRef("organizationId", input.organizationId, (id) =>
    getOrganization(scoped, id, store),
  );
  const row: Contact = {
    id: newId(),
    tenantId: scoped,
    name: short(input.name) as string,
    email: normalizeContactEmail(short(input.email ?? null) ?? null),
    phone: short(input.phone ?? null) ?? null,
    jobTitle: short(input.jobTitle ?? null) ?? null,
    organizationId: input.organizationId ?? null,
    status: input.status,
    createdAt: now(),
  };
  await assertEmailFree(store, scoped, row.email);
  return store.contacts.insert(row);
}

export async function updateContact(
  tenantId: string,
  id: string,
  input: UpdateContactInput,
  store: CrmStore = defaultStore(),
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  if (input.name !== undefined) short(input.name);
  if (input.email !== undefined) short(input.email);
  if (input.phone !== undefined) short(input.phone);
  if (input.jobTitle !== undefined) short(input.jobTitle);
  if (input.status !== undefined) {
    assertOneOf(CONTACT_STATUSES, input.status, "status");
  }
  await assertRef("organizationId", input.organizationId, (ref) =>
    getOrganization(scoped, ref, store),
  );
  const normalized: UpdateContactInput =
    input.email !== undefined
      ? { ...input, email: normalizeContactEmail(input.email) }
      : input;
  await assertEmailFree(store, scoped, normalized.email, id);
  return store.contacts.update(scoped, id, normalized);
}

export async function deleteContact(
  tenantId: string,
  id: string,
  store: CrmStore = defaultStore(),
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  return store.contacts.delete(scoped, id);
}

export async function contactCascadePreview(
  tenantId: string,
  id: string,
  store: CrmStore = defaultStore(),
): Promise<CascadePreview> {
  const scoped = requireTenantId(tenantId);
  return store.contacts.cascadePreview(scoped, id);
}

async function assertDealRefs(
  tenantId: string,
  input: UpdateDealInput,
  store: CrmStore = defaultStore(),
): Promise<void> {
  await assertRef("organizationId", input.organizationId, (id) =>
    getOrganization(tenantId, id, store),
  );
  await assertRef("contactId", input.contactId, (id) =>
    getContact(tenantId, id, store),
  );
}

export async function listDeals(
  tenantId: string,
  store: CrmStore = defaultStore(),
  opts?: ListDealsOpts,
): Promise<Deal[]> {
  const scoped = requireTenantId(tenantId);
  return store.deals.list(scoped, opts);
}

export async function getDeal(
  tenantId: string,
  id: string,
  store: CrmStore = defaultStore(),
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  return store.deals.get(scoped, id);
}

export async function createDeal(
  tenantId: string,
  input: CreateDealInput,
  store: CrmStore = defaultStore(),
): Promise<Deal> {
  const scoped = requireTenantId(tenantId);
  assertOneOf(DEAL_STAGES, input.stage, "stage");
  await assertDealRefs(scoped, input, store);
  const value = assertMoney(input.value, { min: 0, max: MAX_MONEY });
  const probability = assertPercent(
    input.probability ?? STAGE_PROBABILITY[input.stage],
    { min: 0, max: 100 },
  );
  const row: Deal = {
    id: newId(),
    tenantId: scoped,
    name: short(input.name) as string,
    organizationId: input.organizationId ?? null,
    contactId: input.contactId ?? null,
    stage: input.stage,
    value,
    probability,
    closeDate: input.closeDate ?? null,
    boardOrder:
      input.boardOrder ??
      (await store.deals.nextBoardOrder(scoped, input.stage)),
    createdAt: now(),
  };
  return store.deals.insert(row);
}

export async function updateDeal(
  tenantId: string,
  id: string,
  input: UpdateDealInput,
  store: CrmStore = defaultStore(),
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  if (input.name !== undefined) short(input.name);
  if (input.value !== undefined) {
    assertMoney(input.value, { min: 0, max: MAX_MONEY });
  }
  if (input.probability !== undefined) {
    assertPercent(input.probability, { min: 0, max: 100 });
  }
  if (input.stage !== undefined) {
    assertOneOf(DEAL_STAGES, input.stage, "stage");
  }
  await assertDealRefs(scoped, input, store);
  return store.deals.update(scoped, id, input);
}

/** Writes a whole column's new order at once; the caller has already decided it. */
export async function reorderDeals(
  tenantId: string,
  rows: DealPlacement[],
  store: CrmStore = defaultStore(),
): Promise<void> {
  await store.deals.reorder(requireTenantId(tenantId), rows);
}

export async function deleteDeal(
  tenantId: string,
  id: string,
  store: CrmStore = defaultStore(),
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  return store.deals.delete(scoped, id);
}

export async function dealCascadePreview(
  tenantId: string,
  id: string,
  store: CrmStore = defaultStore(),
): Promise<CascadePreview> {
  const scoped = requireTenantId(tenantId);
  return store.deals.cascadePreview(scoped, id);
}

async function assertActivityRefs(
  tenantId: string,
  input: UpdateActivityInput,
  store: CrmStore = defaultStore(),
): Promise<void> {
  await assertRef("contactId", input.contactId, (id) =>
    getContact(tenantId, id, store),
  );
  await assertRef("dealId", input.dealId, (id) => getDeal(tenantId, id, store));
}

export async function listActivities(
  tenantId: string,
  store: CrmStore = defaultStore(),
  opts?: ListActivitiesOpts,
): Promise<Activity[]> {
  const scoped = requireTenantId(tenantId);
  return store.activities.list(scoped, opts);
}

export async function getActivity(
  tenantId: string,
  id: string,
  store: CrmStore = defaultStore(),
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  return store.activities.get(scoped, id);
}

export async function createActivity(
  tenantId: string,
  input: CreateActivityInput,
  store: CrmStore = defaultStore(),
): Promise<Activity> {
  const scoped = requireTenantId(tenantId);
  assertOneOf(ACTIVITY_TYPES, input.type, "type");
  await assertActivityRefs(scoped, input, store);
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
  return store.activities.insert(row);
}

export async function updateActivity(
  tenantId: string,
  id: string,
  input: UpdateActivityInput,
  store: CrmStore = defaultStore(),
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  if (input.description !== undefined) long(input.description);
  if (input.type !== undefined) {
    assertOneOf(ACTIVITY_TYPES, input.type, "type");
  }
  await assertActivityRefs(scoped, input, store);
  return store.activities.update(scoped, id, input);
}

export async function deleteActivity(
  tenantId: string,
  id: string,
  store: CrmStore = defaultStore(),
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  return store.activities.delete(scoped, id);
}
