import { type DealStage } from "./constants";
import {
  type Activity,
  type Contact,
  type CrmRepository,
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
  compareActivitiesNewestFirst,
  contactMatchesSearch,
  dealMatchesSearch,
  nextProbabilityOnStageChange,
  organizationMatchesSearch,
} from "./queries-shared";

export function createMemoryCrmRepository(): CrmRepository {
  return {
    organizations: [],
    contacts: [],
    deals: [],
    activities: [],
  };
}

/**
 * The store-level refusal when two contacts in one tenant would hold the
 * same email in any casing. Carries the clashing row so the action layer
 * can name it and link to it; a bare instance with no `existing` is the
 * race fallback, where the losing write never saw the winner's row.
 */
export class DuplicateContactEmailError extends Error {
  readonly code = "duplicate_email" as const;
  readonly existing?: { id: string; name: string; email: string };

  constructor(existing?: { id: string; name: string; email: string }) {
    super("A contact with this email already exists in this tenant.");
    this.name = "DuplicateContactEmailError";
    this.existing = existing;
  }
}

/**
 * Trim leading/trailing whitespace; an empty string becomes null so cleared
 * emails cannot collide with each other in the unique index (`NULL`s are
 * distinct, `""` is not). Idempotent.
 */
export function normalizeContactEmail(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Tenant-scoped case-insensitive lookup on the same expression the unique
 * index and the Drizzle pre-check use — the memory mirror of 8.1's
 * `lower(email)` lookup. Nullish and empty input matches nothing.
 */
export function findContactByEmailInMemory(
  repo: CrmRepository,
  tenantId: string,
  email: string | null | undefined,
  excludeId?: string,
): Contact | null {
  const wanted = normalizeContactEmail(email);
  if (!wanted) {
    return null;
  }
  const lowered = wanted.toLowerCase();
  const found = repo.contacts.find(
    (row) =>
      row.tenantId === tenantId &&
      row.email != null &&
      row.email.trim().toLowerCase() === lowered &&
      row.id !== excludeId,
  );
  return found ? clone(found) : null;
}

function findScoped<T extends { id: string; tenantId: string }>(
  rows: T[],
  tenantId: string,
  id: string,
): T | undefined {
  return rows.find((row) => row.tenantId === tenantId && row.id === id);
}

export function listOrganizationsInMemory(
  repo: CrmRepository,
  scoped: string,
  q?: string,
): Organization[] {
  return repo.organizations
    .filter(
      (row) => row.tenantId === scoped && organizationMatchesSearch(row, q),
    )
    .map(clone);
}

export function getOrganizationInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
): Organization | null {
  const row = findScoped(repo.organizations, scoped, id);
  return row ? clone(row) : null;
}

export function createOrganizationInMemory(
  repo: CrmRepository,
  row: Organization,
): Organization {
  repo.organizations.push(row);
  return clone(row);
}

export function updateOrganizationInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
  input: UpdateOrganizationInput,
): Organization | null {
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

export function deleteOrganizationInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
): Organization | null {
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

export function listContactsInMemory(
  repo: CrmRepository,
  scoped: string,
  opts?: ListContactsOpts,
): Contact[] {
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

export function getContactInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
): Contact | null {
  const row = findScoped(repo.contacts, scoped, id);
  return row ? clone(row) : null;
}

export function createContactInMemory(
  repo: CrmRepository,
  row: Contact,
): Contact {
  const email = normalizeContactEmail(row.email);
  if (email) {
    const clash = findContactByEmailInMemory(repo, row.tenantId, email);
    if (clash) {
      throw new DuplicateContactEmailError({
        id: clash.id,
        name: clash.name,
        email: clash.email ?? email,
      });
    }
  }
  const stored: Contact = { ...row, email };
  repo.contacts.push(stored);
  return clone(stored);
}

export function updateContactInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
  input: UpdateContactInput,
): Contact | null {
  const row = findScoped(repo.contacts, scoped, id);
  if (!row) {
    return null;
  }
  const email =
    input.email !== undefined ? normalizeContactEmail(input.email) : undefined;
  if (email) {
    const clash = findContactByEmailInMemory(repo, scoped, email, id);
    if (clash) {
      throw new DuplicateContactEmailError({
        id: clash.id,
        name: clash.name,
        email: clash.email ?? email,
      });
    }
  }
  if (input.name !== undefined) row.name = input.name;
  if (input.email !== undefined) row.email = email ?? null;
  if (input.phone !== undefined) row.phone = input.phone;
  if (input.jobTitle !== undefined) row.jobTitle = input.jobTitle;
  if (input.organizationId !== undefined) {
    row.organizationId = input.organizationId;
  }
  if (input.status !== undefined) row.status = input.status;
  return clone(row);
}

export function deleteContactInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
): Contact | null {
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

export function nextBoardOrderInMemory(
  repo: CrmRepository,
  tenantId: string,
  stage: DealStage,
): number {
  const orders = repo.deals
    .filter((row) => row.tenantId === tenantId && row.stage === stage)
    .map((row) => row.boardOrder);
  if (orders.length === 0) {
    return 0;
  }
  return Math.max(...orders) + 1;
}

export function listDealsInMemory(
  repo: CrmRepository,
  scoped: string,
  opts?: ListDealsOpts,
): Deal[] {
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

export function getDealInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
): Deal | null {
  const row = findScoped(repo.deals, scoped, id);
  return row ? clone(row) : null;
}

export function createDealInMemory(repo: CrmRepository, row: Deal): Deal {
  repo.deals.push(row);
  return clone(row);
}

export function updateDealInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
  input: UpdateDealInput,
): Deal | null {
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

export function deleteDealInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
): Deal | null {
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

export function listActivitiesInMemory(
  repo: CrmRepository,
  scoped: string,
  opts?: ListActivitiesOpts,
): Activity[] {
  return repo.activities
    .filter(
      (row) =>
        row.tenantId === scoped &&
        (opts?.contactId === undefined || row.contactId === opts.contactId) &&
        (opts?.dealId === undefined || row.dealId === opts.dealId),
    )
    .map(clone)
    .sort(compareActivitiesNewestFirst);
}

export function getActivityInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
): Activity | null {
  const row = findScoped(repo.activities, scoped, id);
  return row ? clone(row) : null;
}

export function createActivityInMemory(
  repo: CrmRepository,
  row: Activity,
): Activity {
  repo.activities.push(row);
  return clone(row);
}

export function updateActivityInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
  input: UpdateActivityInput,
): Activity | null {
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

export function deleteActivityInMemory(
  repo: CrmRepository,
  scoped: string,
  id: string,
): Activity | null {
  const index = repo.activities.findIndex(
    (row) => row.tenantId === scoped && row.id === id,
  );
  if (index === -1) {
    return null;
  }
  const [removed] = repo.activities.splice(index, 1);
  return clone(removed);
}
