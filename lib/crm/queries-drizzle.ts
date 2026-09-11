import { and, desc, eq, getTableColumns, max, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import type { WriteOpts } from "../db/batch-transaction";
import { type DealStage } from "./constants";
import {
  type Activity,
  type Contact,
  type Deal,
  type ListActivitiesOpts,
  type ListContactsOpts,
  type ListDealsOpts,
  type Organization,
  type UpdateActivityInput,
  type UpdateContactInput,
  type UpdateDealInput,
  type UpdateOrganizationInput,
  clone,
  nextProbabilityOnStageChange,
  organizationSearchTerm,
} from "./queries-shared";
import { activities, contacts, deals, organizations } from "./schema";
import { escapeIlike } from "../input/text";

function requireCrmDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("CRM store required");
  }
  return getDb();
}

function tenantRow(
  table:
    typeof organizations | typeof contacts | typeof deals | typeof activities,
  tenantId: string,
  id: string,
) {
  return and(eq(table.tenantId, tenantId), eq(table.id, id));
}

function containsPattern(term: string) {
  return `%${escapeIlike(term)}%`;
}

/** ILIKE with ESCAPE '\' so user %, _, and \ are literals. */
function ilikeContains(
  column:
    | typeof organizations.name
    | typeof organizations.website
    | typeof organizations.industry
    | typeof contacts.name
    | typeof contacts.email
    | typeof contacts.jobTitle
    | typeof deals.name,
  term: string,
) {
  return sql`${column} ilike ${containsPattern(term)} escape '\\'`;
}

function organizationSearchSql(q?: string) {
  const term = organizationSearchTerm(q);
  if (!term) {
    return undefined;
  }
  return or(
    ilikeContains(organizations.name, term),
    ilikeContains(organizations.website, term),
    ilikeContains(organizations.industry, term),
  );
}

function contactSearchSql(q?: string) {
  const term = organizationSearchTerm(q);
  if (!term) {
    return undefined;
  }
  return or(
    ilikeContains(contacts.name, term),
    ilikeContains(contacts.email, term),
    ilikeContains(contacts.jobTitle, term),
  );
}

function dealSearchSql(q?: string) {
  const term = organizationSearchTerm(q);
  if (!term) {
    return undefined;
  }
  return or(
    ilikeContains(deals.name, term),
    ilikeContains(organizations.name, term),
    ilikeContains(contacts.name, term),
  );
}

export async function listOrganizationsInDrizzle(
  scoped: string,
  q?: string,
): Promise<Organization[]> {
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

export async function getOrganizationInDrizzle(
  scoped: string,
  id: string,
): Promise<Organization | null> {
  const [row] = await requireCrmDb()
    .select()
    .from(organizations)
    .where(tenantRow(organizations, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function insertOrganization(
  row: Organization,
  opts?: WriteOpts,
): Promise<Organization> {
  if (opts?.batch) {
    opts.batch.insert(organizations, row);
    return clone(row);
  }

  const [inserted] = await requireCrmDb()
    .insert(organizations)
    .values(row)
    .returning();
  return inserted;
}

export async function updateOrganizationInDrizzle(
  scoped: string,
  id: string,
  input: UpdateOrganizationInput,
): Promise<Organization | null> {
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

export async function deleteOrganizationInDrizzle(
  scoped: string,
  id: string,
): Promise<Organization | null> {
  const [removed] = await requireCrmDb()
    .delete(organizations)
    .where(tenantRow(organizations, scoped, id))
    .returning();
  return removed ?? null;
}

export async function listContactsInDrizzle(
  scoped: string,
  opts?: ListContactsOpts,
): Promise<Contact[]> {
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

export async function getContactInDrizzle(
  scoped: string,
  id: string,
): Promise<Contact | null> {
  const [row] = await requireCrmDb()
    .select()
    .from(contacts)
    .where(tenantRow(contacts, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function insertContact(
  row: Contact,
  opts?: WriteOpts,
): Promise<Contact> {
  if (opts?.batch) {
    opts.batch.insert(contacts, row);
    return clone(row);
  }

  const [inserted] = await requireCrmDb()
    .insert(contacts)
    .values(row)
    .returning();
  return inserted;
}

export async function updateContactInDrizzle(
  scoped: string,
  id: string,
  input: UpdateContactInput,
): Promise<Contact | null> {
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

export async function deleteContactInDrizzle(
  scoped: string,
  id: string,
): Promise<Contact | null> {
  const [removed] = await requireCrmDb()
    .delete(contacts)
    .where(tenantRow(contacts, scoped, id))
    .returning();
  return removed ?? null;
}

export async function nextBoardOrderInDrizzle(
  tenantId: string,
  stage: DealStage,
): Promise<number> {
  const [agg] = await requireCrmDb()
    .select({ maxOrder: max(deals.boardOrder) })
    .from(deals)
    .where(and(eq(deals.tenantId, tenantId), eq(deals.stage, stage)));
  return agg?.maxOrder == null ? 0 : agg.maxOrder + 1;
}

export async function listDealsInDrizzle(
  scoped: string,
  opts?: ListDealsOpts,
): Promise<Deal[]> {
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

export async function getDealInDrizzle(
  scoped: string,
  id: string,
): Promise<Deal | null> {
  const [row] = await requireCrmDb()
    .select()
    .from(deals)
    .where(tenantRow(deals, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function insertDeal(row: Deal, opts?: WriteOpts): Promise<Deal> {
  if (opts?.batch) {
    opts.batch.insert(deals, row);
    return clone(row);
  }

  const [inserted] = await requireCrmDb().insert(deals).values(row).returning();
  return inserted;
}

export async function updateDealInDrizzle(
  scoped: string,
  id: string,
  input: UpdateDealInput,
): Promise<Deal | null> {
  const current = await getDealInDrizzle(scoped, id);
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

export async function deleteDealInDrizzle(
  scoped: string,
  id: string,
): Promise<Deal | null> {
  const [removed] = await requireCrmDb()
    .delete(deals)
    .where(tenantRow(deals, scoped, id))
    .returning();
  return removed ?? null;
}

export async function listActivitiesInDrizzle(
  scoped: string,
  opts?: ListActivitiesOpts,
): Promise<Activity[]> {
  const filters = [
    eq(activities.tenantId, scoped),
    ...(opts?.contactId !== undefined
      ? [eq(activities.contactId, opts.contactId)]
      : []),
    ...(opts?.dealId !== undefined ? [eq(activities.dealId, opts.dealId)] : []),
  ];
  return requireCrmDb()
    .select()
    .from(activities)
    .where(and(...filters))
    .orderBy(
      sql`${activities.occurredAt} DESC NULLS LAST`,
      desc(activities.createdAt),
      activities.id,
    );
}

export async function getActivityInDrizzle(
  scoped: string,
  id: string,
): Promise<Activity | null> {
  const [row] = await requireCrmDb()
    .select()
    .from(activities)
    .where(tenantRow(activities, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function insertActivity(
  row: Activity,
  opts?: WriteOpts,
): Promise<Activity> {
  if (opts?.batch) {
    opts.batch.insert(activities, row);
    return clone(row);
  }

  const [inserted] = await requireCrmDb()
    .insert(activities)
    .values(row)
    .returning();
  return inserted;
}

export async function updateActivityInDrizzle(
  scoped: string,
  id: string,
  input: UpdateActivityInput,
): Promise<Activity | null> {
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

export async function deleteActivityInDrizzle(
  scoped: string,
  id: string,
): Promise<Activity | null> {
  const [removed] = await requireCrmDb()
    .delete(activities)
    .where(tenantRow(activities, scoped, id))
    .returning();
  return removed ?? null;
}
