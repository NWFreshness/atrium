import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  lt,
  max,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../db";
import { type DealStage } from "./constants";
import {
  type Activity,
  type CascadePreview,
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
  nextProbabilityOnStageChange,
  organizationSearchTerm,
} from "./queries-shared";
import { activities, contacts, deals, organizations } from "./schema";
import { escapeIlike } from "../input/text";

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
  db: Database,
  scoped: string,
  q?: string,
): Promise<Organization[]> {
  const search = organizationSearchSql(q);
  return db
    .select()
    .from(organizations)
    .where(
      search
        ? and(eq(organizations.tenantId, scoped), search)
        : eq(organizations.tenantId, scoped),
    );
}

export async function getOrganizationInDrizzle(
  db: Database,
  scoped: string,
  id: string,
): Promise<Organization | null> {
  const [row] = await db
    .select()
    .from(organizations)
    .where(tenantRow(organizations, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function insertOrganization(
  db: Database,
  row: Organization,
): Promise<Organization> {
  const [inserted] = await db.insert(organizations).values(row).returning();
  return inserted;
}

export async function updateOrganizationInDrizzle(
  db: Database,
  scoped: string,
  id: string,
  input: UpdateOrganizationInput,
): Promise<Organization | null> {
  const [row] = await db
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
  db: Database,
  scoped: string,
  id: string,
): Promise<Organization | null> {
  const [removed] = await db
    .delete(organizations)
    .where(tenantRow(organizations, scoped, id))
    .returning();
  return removed ?? null;
}

export async function listContactsInDrizzle(
  db: Database,
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
  return db
    .select()
    .from(contacts)
    .where(and(...filters));
}

export async function getContactInDrizzle(
  db: Database,
  scoped: string,
  id: string,
): Promise<Contact | null> {
  const [row] = await db
    .select()
    .from(contacts)
    .where(tenantRow(contacts, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function insertContact(
  db: Database,
  row: Contact,
): Promise<Contact> {
  const [inserted] = await db.insert(contacts).values(row).returning();
  return inserted;
}

/**
 * Keyed on the SQLSTATE, never on an index name: the name is a deployment
 * detail, and a code-stripped driver error still carries the duplicate-key
 * message. Mirrors the signup store's mapping for `users_email_lower_idx`.
 */
const UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as { code?: unknown; message?: unknown };
  if (candidate.code === UNIQUE_VIOLATION) {
    return true;
  }
  return (
    typeof candidate.message === "string" &&
    candidate.message.includes("duplicate key value")
  );
}

/**
 * The tenant-scoped case-insensitive pre-check on the same expression the
 * unique index enforces — the Drizzle mirror of 8.1's `lower(email)`
 * lookup. The self-exclusion lets a contact keep (or re-case) its own
 * address; without it every casing fix reads as a duplicate.
 */
export function contactEmailPrecheck(
  tenantId: string,
  email: string,
  excludeId?: string,
): SQL {
  const scoped = and(
    eq(contacts.tenantId, tenantId),
    sql`lower(${contacts.email}) = ${email.trim().toLowerCase()}`,
    excludeId === undefined ? undefined : ne(contacts.id, excludeId),
  );
  if (!scoped) {
    throw new Error("contact email pre-check needs a tenant");
  }
  return scoped;
}

export async function findContactByEmailInDrizzle(
  db: Database,
  tenantId: string,
  email: string | null,
  excludeId?: string,
): Promise<Contact | null> {
  if (email == null || email.trim() === "") {
    return null;
  }
  const [row] = await db
    .select()
    .from(contacts)
    .where(contactEmailPrecheck(tenantId, email, excludeId))
    .limit(1);
  return row ?? null;
}

export async function updateContactInDrizzle(
  db: Database,
  scoped: string,
  id: string,
  input: UpdateContactInput,
): Promise<Contact | null> {
  const [row] = await db
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
  db: Database,
  scoped: string,
  id: string,
): Promise<Contact | null> {
  const [removed] = await db
    .delete(contacts)
    .where(tenantRow(contacts, scoped, id))
    .returning();
  return removed ?? null;
}

export async function nextBoardOrderInDrizzle(
  db: Database,
  tenantId: string,
  stage: DealStage,
): Promise<number> {
  const [agg] = await db
    .select({ maxOrder: max(deals.boardOrder) })
    .from(deals)
    .where(and(eq(deals.tenantId, tenantId), eq(deals.stage, stage)));
  return agg?.maxOrder == null ? 0 : agg.maxOrder + 1;
}

export async function listDealsInDrizzle(
  db: Database,
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
    ...(opts?.stage !== undefined ? [eq(deals.stage, opts.stage)] : []),
    ...(opts?.closeAfter !== undefined
      ? [gte(deals.closeDate, opts.closeAfter)]
      : []),
    ...(opts?.closeBefore !== undefined
      ? [lt(deals.closeDate, opts.closeBefore)]
      : []),
  ];
  if (!search) {
    return db
      .select()
      .from(deals)
      .where(and(...filters));
  }
  return db
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
  db: Database,
  scoped: string,
  id: string,
): Promise<Deal | null> {
  const [row] = await db
    .select()
    .from(deals)
    .where(tenantRow(deals, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function insertDeal(db: Database, row: Deal): Promise<Deal> {
  const [inserted] = await db.insert(deals).values(row).returning();
  return inserted;
}

export async function updateDealInDrizzle(
  db: Database,
  scoped: string,
  id: string,
  input: UpdateDealInput,
): Promise<Deal | null> {
  const current = await getDealInDrizzle(db, scoped, id);
  if (!current) {
    return null;
  }
  const probability = nextProbabilityOnStageChange(current.stage, input);
  const [row] = await db
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
  db: Database,
  scoped: string,
  id: string,
): Promise<Deal | null> {
  const [removed] = await db
    .delete(deals)
    .where(tenantRow(deals, scoped, id))
    .returning();
  return removed ?? null;
}

export async function listActivitiesInDrizzle(
  db: Database,
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
  return db
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
  db: Database,
  scoped: string,
  id: string,
): Promise<Activity | null> {
  const [row] = await db
    .select()
    .from(activities)
    .where(tenantRow(activities, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function insertActivity(
  db: Database,
  row: Activity,
): Promise<Activity> {
  const [inserted] = await db.insert(activities).values(row).returning();
  return inserted;
}

export async function updateActivityInDrizzle(
  db: Database,
  scoped: string,
  id: string,
  input: UpdateActivityInput,
): Promise<Activity | null> {
  const [row] = await db
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
  db: Database,
  scoped: string,
  id: string,
): Promise<Activity | null> {
  const [removed] = await db
    .delete(activities)
    .where(tenantRow(activities, scoped, id))
    .returning();
  return removed ?? null;
}

export async function organizationCascadePreviewInDrizzle(
  db: Database,
  scoped: string,
  id: string,
): Promise<CascadePreview> {
  const [contactRows] = await db
    .select({ n: count() })
    .from(contacts)
    .where(and(eq(contacts.tenantId, scoped), eq(contacts.organizationId, id)));
  const [dealRows] = await db
    .select({ n: count() })
    .from(deals)
    .where(and(eq(deals.tenantId, scoped), eq(deals.organizationId, id)));
  return {
    contacts: contactRows?.n ?? 0,
    deals: dealRows?.n ?? 0,
    activities: 0,
  };
}

export async function contactCascadePreviewInDrizzle(
  db: Database,
  scoped: string,
  id: string,
): Promise<CascadePreview> {
  const [dealRows] = await db
    .select({ n: count() })
    .from(deals)
    .where(and(eq(deals.tenantId, scoped), eq(deals.contactId, id)));
  const [activityRows] = await db
    .select({ n: count() })
    .from(activities)
    .where(and(eq(activities.tenantId, scoped), eq(activities.contactId, id)));
  return {
    contacts: 0,
    deals: dealRows?.n ?? 0,
    activities: activityRows?.n ?? 0,
  };
}

export async function dealCascadePreviewInDrizzle(
  db: Database,
  scoped: string,
  id: string,
): Promise<CascadePreview> {
  const [activityRows] = await db
    .select({ n: count() })
    .from(activities)
    .where(and(eq(activities.tenantId, scoped), eq(activities.dealId, id)));
  return {
    contacts: 0,
    deals: 0,
    activities: activityRows?.n ?? 0,
  };
}
