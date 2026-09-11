import { type InferSelectModel } from "drizzle-orm";
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

export type ListContactsOpts = {
  q?: string;
  status?: ContactStatus;
  organizationId?: string;
};

export type ListDealsOpts = {
  q?: string;
  organizationId?: string;
  contactId?: string;
};

export type ListActivitiesOpts = {
  contactId?: string;
  dealId?: string;
};

export function requireTenantId(tenantId: string): string {
  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new Error("tenantId is required");
  }
  return tenantId;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): Date {
  return new Date();
}

export function clone<T>(row: T): T {
  return { ...row };
}

export function organizationSearchTerm(q?: string): string | undefined {
  const term = q?.trim();
  return term ? term : undefined;
}

export function organizationMatchesSearch(
  row: Organization,
  q?: string,
): boolean {
  const term = organizationSearchTerm(q);
  if (!term) {
    return true;
  }
  const needle = term.toLowerCase();
  return [row.name, row.website, row.industry].some((value) =>
    value?.toLowerCase().includes(needle),
  );
}

export function contactMatchesSearch(row: Contact, q?: string): boolean {
  const term = organizationSearchTerm(q);
  if (!term) {
    return true;
  }
  const needle = term.toLowerCase();
  return [row.name, row.email, row.jobTitle].some((value) =>
    value?.toLowerCase().includes(needle),
  );
}

export function dealMatchesSearch(
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

export function compareActivitiesNewestFirst(a: Activity, b: Activity): number {
  const aOccurred = a.occurredAt?.getTime();
  const bOccurred = b.occurredAt?.getTime();
  if (aOccurred != null && bOccurred != null && aOccurred !== bOccurred) {
    return bOccurred - aOccurred;
  }
  if (aOccurred != null && bOccurred == null) {
    return -1;
  }
  if (aOccurred == null && bOccurred != null) {
    return 1;
  }
  const created = b.createdAt.getTime() - a.createdAt.getTime();
  if (created !== 0) {
    return created;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function nextProbabilityOnStageChange(
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
