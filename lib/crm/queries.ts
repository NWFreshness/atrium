import type { InferSelectModel } from "drizzle-orm";
import type { ActivityType, ContactStatus, DealStage } from "./constants";
import type { activities, contacts, deals, organizations } from "./schema";

export type Organization = InferSelectModel<typeof organizations>;
export type Contact = InferSelectModel<typeof contacts>;
export type Deal = InferSelectModel<typeof deals>;
export type Activity = InferSelectModel<typeof activities>;

export type CrmRepository = {
  organizations: Organization[];
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
};

export type CreateOrganizationInput = {
  name: string;
  website?: string | null;
  industry?: string | null;
  notes?: string | null;
};

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

export type CreateContactInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  organizationId?: string | null;
  status: ContactStatus;
};

export type UpdateContactInput = Partial<CreateContactInput>;

export type CreateDealInput = {
  name: string;
  organizationId?: string | null;
  contactId?: string | null;
  stage: DealStage;
  value: number;
  probability: number;
  closeDate?: Date | null;
  boardOrder: number;
};

export type UpdateDealInput = Partial<CreateDealInput>;

export type CreateActivityInput = {
  type: ActivityType;
  contactId?: string | null;
  dealId?: string | null;
  description: string;
  occurredAt?: Date | null;
  dueDate?: Date | null;
  done: boolean;
};

export type UpdateActivityInput = Partial<CreateActivityInput>;

export function createMemoryCrmRepository(): CrmRepository {
  return {
    organizations: [],
    contacts: [],
    deals: [],
    activities: [],
  };
}

function requireTenantId(tenantId: string): string {
  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new Error("tenantId is required");
  }
  return tenantId;
}

function newId(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
}

function clone<T>(row: T): T {
  return { ...row };
}

function findScoped<T extends { id: string; tenantId: string }>(
  rows: T[],
  tenantId: string,
  id: string,
): T | undefined {
  return rows.find((row) => row.tenantId === tenantId && row.id === id);
}

export async function listOrganizations(
  tenantId: string,
  repo: CrmRepository,
): Promise<Organization[]> {
  const scoped = requireTenantId(tenantId);
  return repo.organizations.filter((row) => row.tenantId === scoped).map(clone);
}

export async function getOrganization(
  tenantId: string,
  id: string,
  repo: CrmRepository,
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  const row = findScoped(repo.organizations, scoped, id);
  return row ? clone(row) : null;
}

export async function createOrganization(
  tenantId: string,
  input: CreateOrganizationInput,
  repo: CrmRepository,
): Promise<Organization> {
  const scoped = requireTenantId(tenantId);
  const row: Organization = {
    id: newId(),
    tenantId: scoped,
    name: input.name,
    website: input.website ?? null,
    industry: input.industry ?? null,
    notes: input.notes ?? null,
    createdAt: now(),
  };
  repo.organizations.push(row);
  return clone(row);
}

export async function updateOrganization(
  tenantId: string,
  id: string,
  input: UpdateOrganizationInput,
  repo: CrmRepository,
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  const row = findScoped(repo.organizations, scoped, id);
  if (!row) {
    return null;
  }
  if (input.name !== undefined) row.name = input.name;
  if (input.website !== undefined) row.website = input.website;
  if (input.industry !== undefined) row.industry = input.industry;
  if (input.notes !== undefined) row.notes = input.notes;
  return clone(row);
}

export async function deleteOrganization(
  tenantId: string,
  id: string,
  repo: CrmRepository,
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  const index = repo.organizations.findIndex(
    (row) => row.tenantId === scoped && row.id === id,
  );
  if (index === -1) {
    return null;
  }
  const [removed] = repo.organizations.splice(index, 1);
  for (const contact of repo.contacts) {
    if (contact.tenantId === scoped && contact.organizationId === id) {
      contact.organizationId = null;
    }
  }
  for (const deal of repo.deals) {
    if (deal.tenantId === scoped && deal.organizationId === id) {
      deal.organizationId = null;
    }
  }
  return clone(removed);
}

export async function listContacts(
  tenantId: string,
  repo: CrmRepository,
): Promise<Contact[]> {
  const scoped = requireTenantId(tenantId);
  return repo.contacts.filter((row) => row.tenantId === scoped).map(clone);
}

export async function getContact(
  tenantId: string,
  id: string,
  repo: CrmRepository,
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  const row = findScoped(repo.contacts, scoped, id);
  return row ? clone(row) : null;
}

export async function createContact(
  tenantId: string,
  input: CreateContactInput,
  repo: CrmRepository,
): Promise<Contact> {
  const scoped = requireTenantId(tenantId);
  const row: Contact = {
    id: newId(),
    tenantId: scoped,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    jobTitle: input.jobTitle ?? null,
    organizationId: input.organizationId ?? null,
    status: input.status,
    createdAt: now(),
  };
  repo.contacts.push(row);
  return clone(row);
}

export async function updateContact(
  tenantId: string,
  id: string,
  input: UpdateContactInput,
  repo: CrmRepository,
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  const row = findScoped(repo.contacts, scoped, id);
  if (!row) {
    return null;
  }
  if (input.name !== undefined) row.name = input.name;
  if (input.email !== undefined) row.email = input.email;
  if (input.phone !== undefined) row.phone = input.phone;
  if (input.jobTitle !== undefined) row.jobTitle = input.jobTitle;
  if (input.organizationId !== undefined) {
    row.organizationId = input.organizationId;
  }
  if (input.status !== undefined) row.status = input.status;
  return clone(row);
}

export async function deleteContact(
  tenantId: string,
  id: string,
  repo: CrmRepository,
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  const index = repo.contacts.findIndex(
    (row) => row.tenantId === scoped && row.id === id,
  );
  if (index === -1) {
    return null;
  }
  const [removed] = repo.contacts.splice(index, 1);
  for (const deal of repo.deals) {
    if (deal.tenantId === scoped && deal.contactId === id) {
      deal.contactId = null;
    }
  }
  for (const activity of repo.activities) {
    if (activity.tenantId === scoped && activity.contactId === id) {
      activity.contactId = null;
    }
  }
  return clone(removed);
}

export async function listDeals(
  tenantId: string,
  repo: CrmRepository,
): Promise<Deal[]> {
  const scoped = requireTenantId(tenantId);
  return repo.deals.filter((row) => row.tenantId === scoped).map(clone);
}

export async function getDeal(
  tenantId: string,
  id: string,
  repo: CrmRepository,
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  const row = findScoped(repo.deals, scoped, id);
  return row ? clone(row) : null;
}

export async function createDeal(
  tenantId: string,
  input: CreateDealInput,
  repo: CrmRepository,
): Promise<Deal> {
  const scoped = requireTenantId(tenantId);
  const row: Deal = {
    id: newId(),
    tenantId: scoped,
    name: input.name,
    organizationId: input.organizationId ?? null,
    contactId: input.contactId ?? null,
    stage: input.stage,
    value: input.value,
    probability: input.probability,
    closeDate: input.closeDate ?? null,
    boardOrder: input.boardOrder,
    createdAt: now(),
  };
  repo.deals.push(row);
  return clone(row);
}

export async function updateDeal(
  tenantId: string,
  id: string,
  input: UpdateDealInput,
  repo: CrmRepository,
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  const row = findScoped(repo.deals, scoped, id);
  if (!row) {
    return null;
  }
  if (input.name !== undefined) row.name = input.name;
  if (input.organizationId !== undefined) {
    row.organizationId = input.organizationId;
  }
  if (input.contactId !== undefined) row.contactId = input.contactId;
  if (input.stage !== undefined) row.stage = input.stage;
  if (input.value !== undefined) row.value = input.value;
  if (input.probability !== undefined) row.probability = input.probability;
  if (input.closeDate !== undefined) row.closeDate = input.closeDate;
  if (input.boardOrder !== undefined) row.boardOrder = input.boardOrder;
  return clone(row);
}

export async function deleteDeal(
  tenantId: string,
  id: string,
  repo: CrmRepository,
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  const index = repo.deals.findIndex(
    (row) => row.tenantId === scoped && row.id === id,
  );
  if (index === -1) {
    return null;
  }
  const [removed] = repo.deals.splice(index, 1);
  for (const activity of repo.activities) {
    if (activity.tenantId === scoped && activity.dealId === id) {
      activity.dealId = null;
    }
  }
  return clone(removed);
}

export async function listActivities(
  tenantId: string,
  repo: CrmRepository,
): Promise<Activity[]> {
  const scoped = requireTenantId(tenantId);
  return repo.activities.filter((row) => row.tenantId === scoped).map(clone);
}

export async function getActivity(
  tenantId: string,
  id: string,
  repo: CrmRepository,
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  const row = findScoped(repo.activities, scoped, id);
  return row ? clone(row) : null;
}

export async function createActivity(
  tenantId: string,
  input: CreateActivityInput,
  repo: CrmRepository,
): Promise<Activity> {
  const scoped = requireTenantId(tenantId);
  const row: Activity = {
    id: newId(),
    tenantId: scoped,
    type: input.type,
    contactId: input.contactId ?? null,
    dealId: input.dealId ?? null,
    description: input.description,
    occurredAt: input.occurredAt ?? null,
    dueDate: input.dueDate ?? null,
    done: input.done,
    createdAt: now(),
  };
  repo.activities.push(row);
  return clone(row);
}

export async function updateActivity(
  tenantId: string,
  id: string,
  input: UpdateActivityInput,
  repo: CrmRepository,
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  const row = findScoped(repo.activities, scoped, id);
  if (!row) {
    return null;
  }
  if (input.type !== undefined) row.type = input.type;
  if (input.contactId !== undefined) row.contactId = input.contactId;
  if (input.dealId !== undefined) row.dealId = input.dealId;
  if (input.description !== undefined) row.description = input.description;
  if (input.occurredAt !== undefined) row.occurredAt = input.occurredAt;
  if (input.dueDate !== undefined) row.dueDate = input.dueDate;
  if (input.done !== undefined) row.done = input.done;
  return clone(row);
}

export async function deleteActivity(
  tenantId: string,
  id: string,
  repo: CrmRepository,
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  const index = repo.activities.findIndex(
    (row) => row.tenantId === scoped && row.id === id,
  );
  if (index === -1) {
    return null;
  }
  const [removed] = repo.activities.splice(index, 1);
  return clone(removed);
}
