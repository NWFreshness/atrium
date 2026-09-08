import {
  and,
  eq,
  getTableColumns,
  ilike,
  max,
  or,
  type InferSelectModel,
} from "drizzle-orm";
import { getDb } from "../db";
import {
  STAGE_PROBABILITY,
  type ActivityType,
  type ContactStatus,
  type DealStage,
} from "./constants";
import { activities, contacts, deals, organizations } from "./schema";

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
  probability?: number;
  closeDate?: Date | null;
  boardOrder?: number;
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

function requireCrmDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("CRM store required");
  }
  return getDb();
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

function tenantRow(
  table:
    typeof organizations | typeof contacts | typeof deals | typeof activities,
  tenantId: string,
  id: string,
) {
  return and(eq(table.tenantId, tenantId), eq(table.id, id));
}

function organizationSearchTerm(q?: string): string | undefined {
  const term = q?.trim();
  return term ? term : undefined;
}

function organizationMatchesSearch(row: Organization, q?: string): boolean {
  const term = organizationSearchTerm(q);
  if (!term) {
    return true;
  }
  const needle = term.toLowerCase();
  return [row.name, row.website, row.industry].some((value) =>
    value?.toLowerCase().includes(needle),
  );
}

function organizationSearchSql(q?: string) {
  const term = organizationSearchTerm(q);
  if (!term) {
    return undefined;
  }
  const pattern = `%${term}%`;
  return or(
    ilike(organizations.name, pattern),
    ilike(organizations.website, pattern),
    ilike(organizations.industry, pattern),
  );
}

export type ListContactsOpts = {
  q?: string;
  status?: ContactStatus;
  organizationId?: string;
};

function contactMatchesSearch(row: Contact, q?: string): boolean {
  const term = organizationSearchTerm(q);
  if (!term) {
    return true;
  }
  const needle = term.toLowerCase();
  return [row.name, row.email, row.jobTitle].some((value) =>
    value?.toLowerCase().includes(needle),
  );
}

function contactSearchSql(q?: string) {
  const term = organizationSearchTerm(q);
  if (!term) {
    return undefined;
  }
  const pattern = `%${term}%`;
  return or(
    ilike(contacts.name, pattern),
    ilike(contacts.email, pattern),
    ilike(contacts.jobTitle, pattern),
  );
}

export type ListDealsOpts = {
  q?: string;
  organizationId?: string;
  contactId?: string;
};

function dealMatchesSearch(
  row: Deal,
  repo: CrmRepository,
  q?: string,
): boolean {
  const term = organizationSearchTerm(q);
  if (!term) {
    return true;
  }
  const needle = term.toLowerCase();
  if (row.name.toLowerCase().includes(needle)) {
    return true;
  }
  if (row.organizationId) {
    const org = repo.organizations.find(
      (organization) =>
        organization.tenantId === row.tenantId &&
        organization.id === row.organizationId,
    );
    if (org?.name.toLowerCase().includes(needle)) {
      return true;
    }
  }
  if (row.contactId) {
    const contact = repo.contacts.find(
      (person) =>
        person.tenantId === row.tenantId && person.id === row.contactId,
    );
    if (contact?.name.toLowerCase().includes(needle)) {
      return true;
    }
  }
  return false;
}

function dealSearchSql(q?: string) {
  const term = organizationSearchTerm(q);
  if (!term) {
    return undefined;
  }
  const pattern = `%${term}%`;
  return or(
    ilike(deals.name, pattern),
    ilike(organizations.name, pattern),
    ilike(contacts.name, pattern),
  );
}

function nextProbabilityOnStageChange(
  currentStage: DealStage,
  input: UpdateDealInput,
): number | undefined {
  if (input.probability !== undefined) {
    return input.probability;
  }
  if (input.stage !== undefined && input.stage !== currentStage) {
    return STAGE_PROBABILITY[input.stage];
  }
  return undefined;
}

async function nextBoardOrder(
  tenantId: string,
  stage: DealStage,
  repo?: CrmRepository,
): Promise<number> {
  if (repo) {
    const orders = repo.deals
      .filter((row) => row.tenantId === tenantId && row.stage === stage)
      .map((row) => row.boardOrder);
    if (orders.length === 0) {
      return 0;
    }
    return Math.max(...orders) + 1;
  }
  const [agg] = await requireCrmDb()
    .select({ maxOrder: max(deals.boardOrder) })
    .from(deals)
    .where(and(eq(deals.tenantId, tenantId), eq(deals.stage, stage)));
  return agg?.maxOrder == null ? 0 : agg.maxOrder + 1;
}

export async function listOrganizations(
  tenantId: string,
  repo?: CrmRepository,
  q?: string,
): Promise<Organization[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.organizations
      .filter(
        (row) => row.tenantId === scoped && organizationMatchesSearch(row, q),
      )
      .map(clone);
  }
  const search = organizationSearchSql(q);
  return requireCrmDb()
    .select()
    .from(organizations)
    .where(
      search
        ? and(eq(organizations.tenantId, scoped), search)
        : eq(organizations.tenantId, scoped),
    );
}

export async function getOrganization(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.organizations, scoped, id);
    return row ? clone(row) : null;
  }
  const [row] = await requireCrmDb()
    .select()
    .from(organizations)
    .where(tenantRow(organizations, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function createOrganization(
  tenantId: string,
  input: CreateOrganizationInput,
  repo?: CrmRepository,
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
  if (repo) {
    repo.organizations.push(row);
    return clone(row);
  }
  const [inserted] = await requireCrmDb()
    .insert(organizations)
    .values(row)
    .returning();
  return inserted;
}

export async function updateOrganization(
  tenantId: string,
  id: string,
  input: UpdateOrganizationInput,
  repo?: CrmRepository,
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
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
  const [row] = await requireCrmDb()
    .update(organizations)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.website !== undefined ? { website: input.website } : {}),
      ...(input.industry !== undefined ? { industry: input.industry } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    })
    .where(tenantRow(organizations, scoped, id))
    .returning();
  return row ?? null;
}

export async function deleteOrganization(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Organization | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
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
  const [removed] = await requireCrmDb()
    .delete(organizations)
    .where(tenantRow(organizations, scoped, id))
    .returning();
  return removed ?? null;
}

export async function listContacts(
  tenantId: string,
  repo?: CrmRepository,
  opts?: ListContactsOpts,
): Promise<Contact[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.contacts
      .filter(
        (row) =>
          row.tenantId === scoped &&
          contactMatchesSearch(row, opts?.q) &&
          (opts?.status === undefined || row.status === opts.status) &&
          (opts?.organizationId === undefined ||
            row.organizationId === opts.organizationId),
      )
      .map(clone);
  }
  const search = contactSearchSql(opts?.q);
  const filters = [
    eq(contacts.tenantId, scoped),
    ...(search ? [search] : []),
    ...(opts?.status !== undefined ? [eq(contacts.status, opts.status)] : []),
    ...(opts?.organizationId !== undefined
      ? [eq(contacts.organizationId, opts.organizationId)]
      : []),
  ];
  return requireCrmDb()
    .select()
    .from(contacts)
    .where(and(...filters));
}

export async function getContact(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.contacts, scoped, id);
    return row ? clone(row) : null;
  }
  const [row] = await requireCrmDb()
    .select()
    .from(contacts)
    .where(tenantRow(contacts, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function createContact(
  tenantId: string,
  input: CreateContactInput,
  repo?: CrmRepository,
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
  if (repo) {
    repo.contacts.push(row);
    return clone(row);
  }
  const [inserted] = await requireCrmDb()
    .insert(contacts)
    .values(row)
    .returning();
  return inserted;
}

export async function updateContact(
  tenantId: string,
  id: string,
  input: UpdateContactInput,
  repo?: CrmRepository,
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
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
  const [row] = await requireCrmDb()
    .update(contacts)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
      ...(input.organizationId !== undefined
        ? { organizationId: input.organizationId }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
    .where(tenantRow(contacts, scoped, id))
    .returning();
  return row ?? null;
}

export async function deleteContact(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Contact | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
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
  const [removed] = await requireCrmDb()
    .delete(contacts)
    .where(tenantRow(contacts, scoped, id))
    .returning();
  return removed ?? null;
}

export async function listDeals(
  tenantId: string,
  repo?: CrmRepository,
  opts?: ListDealsOpts,
): Promise<Deal[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.deals
      .filter(
        (row) =>
          row.tenantId === scoped &&
          dealMatchesSearch(row, repo, opts?.q) &&
          (opts?.organizationId === undefined ||
            row.organizationId === opts.organizationId) &&
          (opts?.contactId === undefined || row.contactId === opts.contactId),
      )
      .map(clone);
  }
  const search = dealSearchSql(opts?.q);
  const filters = [
    eq(deals.tenantId, scoped),
    ...(search ? [search] : []),
    ...(opts?.organizationId !== undefined
      ? [eq(deals.organizationId, opts.organizationId)]
      : []),
    ...(opts?.contactId !== undefined
      ? [eq(deals.contactId, opts.contactId)]
      : []),
  ];
  if (!search) {
    return requireCrmDb()
      .select()
      .from(deals)
      .where(and(...filters));
  }
  return requireCrmDb()
    .select(getTableColumns(deals))
    .from(deals)
    .leftJoin(
      organizations,
      and(
        eq(deals.organizationId, organizations.id),
        eq(organizations.tenantId, scoped),
      ),
    )
    .leftJoin(
      contacts,
      and(eq(deals.contactId, contacts.id), eq(contacts.tenantId, scoped)),
    )
    .where(and(...filters));
}

export async function getDeal(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.deals, scoped, id);
    return row ? clone(row) : null;
  }
  const [row] = await requireCrmDb()
    .select()
    .from(deals)
    .where(tenantRow(deals, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function createDeal(
  tenantId: string,
  input: CreateDealInput,
  repo?: CrmRepository,
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
    probability: input.probability ?? STAGE_PROBABILITY[input.stage],
    closeDate: input.closeDate ?? null,
    boardOrder:
      input.boardOrder ?? (await nextBoardOrder(scoped, input.stage, repo)),
    createdAt: now(),
  };
  if (repo) {
    repo.deals.push(row);
    return clone(row);
  }
  const [inserted] = await requireCrmDb().insert(deals).values(row).returning();
  return inserted;
}

export async function updateDeal(
  tenantId: string,
  id: string,
  input: UpdateDealInput,
  repo?: CrmRepository,
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.deals, scoped, id);
    if (!row) {
      return null;
    }
    const probability = nextProbabilityOnStageChange(row.stage, input);
    if (input.name !== undefined) row.name = input.name;
    if (input.organizationId !== undefined) {
      row.organizationId = input.organizationId;
    }
    if (input.contactId !== undefined) row.contactId = input.contactId;
    if (input.stage !== undefined) row.stage = input.stage;
    if (input.value !== undefined) row.value = input.value;
    if (probability !== undefined) row.probability = probability;
    if (input.closeDate !== undefined) row.closeDate = input.closeDate;
    if (input.boardOrder !== undefined) row.boardOrder = input.boardOrder;
    return clone(row);
  }
  const current = await getDeal(scoped, id);
  if (!current) {
    return null;
  }
  const probability = nextProbabilityOnStageChange(current.stage, input);
  const [row] = await requireCrmDb()
    .update(deals)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.organizationId !== undefined
        ? { organizationId: input.organizationId }
        : {}),
      ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
      ...(input.stage !== undefined ? { stage: input.stage } : {}),
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(probability !== undefined ? { probability } : {}),
      ...(input.closeDate !== undefined ? { closeDate: input.closeDate } : {}),
      ...(input.boardOrder !== undefined
        ? { boardOrder: input.boardOrder }
        : {}),
    })
    .where(tenantRow(deals, scoped, id))
    .returning();
  return row ?? null;
}

export async function deleteDeal(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Deal | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
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
  const [removed] = await requireCrmDb()
    .delete(deals)
    .where(tenantRow(deals, scoped, id))
    .returning();
  return removed ?? null;
}

export async function listActivities(
  tenantId: string,
  repo?: CrmRepository,
): Promise<Activity[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.activities.filter((row) => row.tenantId === scoped).map(clone);
  }
  return requireCrmDb()
    .select()
    .from(activities)
    .where(eq(activities.tenantId, scoped));
}

export async function getActivity(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.activities, scoped, id);
    return row ? clone(row) : null;
  }
  const [row] = await requireCrmDb()
    .select()
    .from(activities)
    .where(tenantRow(activities, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function createActivity(
  tenantId: string,
  input: CreateActivityInput,
  repo?: CrmRepository,
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
  if (repo) {
    repo.activities.push(row);
    return clone(row);
  }
  const [inserted] = await requireCrmDb()
    .insert(activities)
    .values(row)
    .returning();
  return inserted;
}

export async function updateActivity(
  tenantId: string,
  id: string,
  input: UpdateActivityInput,
  repo?: CrmRepository,
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
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
  const [row] = await requireCrmDb()
    .update(activities)
    .set({
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
      ...(input.dealId !== undefined ? { dealId: input.dealId } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.occurredAt !== undefined
        ? { occurredAt: input.occurredAt }
        : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.done !== undefined ? { done: input.done } : {}),
    })
    .where(tenantRow(activities, scoped, id))
    .returning();
  return row ?? null;
}

export async function deleteActivity(
  tenantId: string,
  id: string,
  repo?: CrmRepository,
): Promise<Activity | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const index = repo.activities.findIndex(
      (row) => row.tenantId === scoped && row.id === id,
    );
    if (index === -1) {
      return null;
    }
    const [removed] = repo.activities.splice(index, 1);
    return clone(removed);
  }
  const [removed] = await requireCrmDb()
    .delete(activities)
    .where(tenantRow(activities, scoped, id))
    .returning();
  return removed ?? null;
}
