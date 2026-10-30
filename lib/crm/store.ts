import type { Database } from "../db";
import { createWriteBatch } from "../db/batch-transaction";
import type { DealStage } from "./constants";
import * as drizzle from "./queries-drizzle";
import * as memory from "./queries-memory";
import { deals } from "./schema";
import {
  DuplicateContactEmailError,
  type Activity,
  type CascadePreview,
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
} from "./queries-shared";

type Table<Row, Patch, Opts> = {
  list(tenantId: string, opts?: Opts): Promise<Row[]>;
  get(tenantId: string, id: string): Promise<Row | null>;
  insert(row: Row): Promise<Row>;
  update(tenantId: string, id: string, patch: Patch): Promise<Row | null>;
  delete(tenantId: string, id: string): Promise<Row | null>;
};
export type DealPlacement = {
  id: string;
  stage: DealStage;
  boardOrder: number;
  probability?: number;
};

/** What deleting a parent row would unlink. */
type Previewed = {
  cascadePreview(tenantId: string, id: string): Promise<CascadePreview>;
};

/**
 * Everything the CRM asks of its storage. Every read and every keyed write
 * takes the tenant first; the rules (validation, defaults, references, the
 * duplicate-email refusal) live above this seam in `queries.ts`, so both
 * adapters only store and fetch.
 */
export type CrmStore = {
  organizations: Table<Organization, UpdateOrganizationInput, string> &
    Previewed;
  contacts: Table<Contact, UpdateContactInput, ListContactsOpts> &
    Previewed & {
      /** `email` arrives trimmed and lowercased; the match is `lower(email)`. */
      findByEmail(
        tenantId: string,
        email: string,
        excludeId?: string,
      ): Promise<Contact | null>;
    };
  deals: Table<Deal, UpdateDealInput, ListDealsOpts> &
    Previewed & {
      nextBoardOrder(tenantId: string, stage: DealStage): Promise<number>;
      /** A whole column's new order, all or nothing. */
      reorder(tenantId: string, rows: DealPlacement[]): Promise<void>;
    };
  activities: Table<Activity, UpdateActivityInput, ListActivitiesOpts>;
};

export function createMemoryCrmStore(
  rows: CrmRepository = memory.createMemoryCrmRepository(),
): CrmStore {
  return {
    organizations: {
      list: async (t, opts) => memory.listOrganizationsInMemory(rows, t, opts),
      get: async (t, id) => memory.getOrganizationInMemory(rows, t, id),
      insert: async (row) => memory.createOrganizationInMemory(rows, row),
      update: async (t, id, patch) =>
        memory.updateOrganizationInMemory(rows, t, id, patch),
      delete: async (t, id) => memory.deleteOrganizationInMemory(rows, t, id),
      cascadePreview: async (t, id) =>
        memory.organizationCascadePreviewInMemory(rows, t, id),
    },
    contacts: {
      list: async (t, opts) => memory.listContactsInMemory(rows, t, opts),
      get: async (t, id) => memory.getContactInMemory(rows, t, id),
      insert: async (row) => memory.createContactInMemory(rows, row),
      update: async (t, id, patch) =>
        memory.updateContactInMemory(rows, t, id, patch),
      delete: async (t, id) => memory.deleteContactInMemory(rows, t, id),
      cascadePreview: async (t, id) =>
        memory.contactCascadePreviewInMemory(rows, t, id),
      findByEmail: async (t, email, excludeId) =>
        memory.findContactByEmailInMemory(rows, t, email, excludeId),
    },
    deals: {
      list: async (t, opts) => memory.listDealsInMemory(rows, t, opts),
      get: async (t, id) => memory.getDealInMemory(rows, t, id),
      insert: async (row) => memory.createDealInMemory(rows, row),
      update: async (t, id, patch) =>
        memory.updateDealInMemory(rows, t, id, patch),
      delete: async (t, id) => memory.deleteDealInMemory(rows, t, id),
      cascadePreview: async (t, id) =>
        memory.dealCascadePreviewInMemory(rows, t, id),
      nextBoardOrder: async (t, stage) =>
        memory.nextBoardOrderInMemory(rows, t, stage),
      reorder: async (t, placements) => {
        for (const placement of placements) {
          const row = rows.deals.find(
            (deal) => deal.tenantId === t && deal.id === placement.id,
          );
          if (!row) continue;
          row.stage = placement.stage;
          row.boardOrder = placement.boardOrder;
          if (placement.probability !== undefined) {
            row.probability = placement.probability;
          }
        }
      },
    },
    activities: {
      list: async (t, opts) => memory.listActivitiesInMemory(rows, t, opts),
      get: async (t, id) => memory.getActivityInMemory(rows, t, id),
      insert: async (row) => memory.createActivityInMemory(rows, row),
      update: async (t, id, patch) =>
        memory.updateActivityInMemory(rows, t, id, patch),
      delete: async (t, id) => memory.deleteActivityInMemory(rows, t, id),
    },
  };
}

/** The unique index is the last word on a raced duplicate; no row to name. */
async function refusingDuplicateEmail<T>(write: Promise<T>): Promise<T> {
  try {
    return await write;
  } catch (error) {
    if (drizzle.isUniqueViolation(error)) {
      throw new DuplicateContactEmailError();
    }
    throw error;
  }
}

export function createDrizzleCrmStore(db: Database): CrmStore {
  return {
    organizations: {
      list: (t, opts) => drizzle.listOrganizationsInDrizzle(db, t, opts),
      get: (t, id) => drizzle.getOrganizationInDrizzle(db, t, id),
      insert: (row) => drizzle.insertOrganization(db, row),
      update: (t, id, patch) =>
        drizzle.updateOrganizationInDrizzle(db, t, id, patch),
      delete: (t, id) => drizzle.deleteOrganizationInDrizzle(db, t, id),
      cascadePreview: (t, id) =>
        drizzle.organizationCascadePreviewInDrizzle(db, t, id),
    },
    contacts: {
      list: (t, opts) => drizzle.listContactsInDrizzle(db, t, opts),
      get: (t, id) => drizzle.getContactInDrizzle(db, t, id),
      insert: (row) => refusingDuplicateEmail(drizzle.insertContact(db, row)),
      update: (t, id, patch) =>
        refusingDuplicateEmail(
          drizzle.updateContactInDrizzle(db, t, id, patch),
        ),
      delete: (t, id) => drizzle.deleteContactInDrizzle(db, t, id),
      cascadePreview: (t, id) =>
        drizzle.contactCascadePreviewInDrizzle(db, t, id),
      findByEmail: (t, email, excludeId) =>
        drizzle.findContactByEmailInDrizzle(db, t, email, excludeId),
    },
    deals: {
      list: (t, opts) => drizzle.listDealsInDrizzle(db, t, opts),
      get: (t, id) => drizzle.getDealInDrizzle(db, t, id),
      insert: (row) => drizzle.insertDeal(db, row),
      update: (t, id, patch) => drizzle.updateDealInDrizzle(db, t, id, patch),
      delete: (t, id) => drizzle.deleteDealInDrizzle(db, t, id),
      cascadePreview: (t, id) => drizzle.dealCascadePreviewInDrizzle(db, t, id),
      nextBoardOrder: (t, stage) =>
        drizzle.nextBoardOrderInDrizzle(db, t, stage),
      reorder: async (t, placements) => {
        // One Neon batch is one transaction (ADR-0002): no gapped column on failure.
        const batch = createWriteBatch(() => db);
        for (const { id, ...set } of placements) {
          batch.update(deals, t, id, set);
        }
        await batch.flush();
      },
    },
    activities: {
      list: (t, opts) => drizzle.listActivitiesInDrizzle(db, t, opts),
      get: (t, id) => drizzle.getActivityInDrizzle(db, t, id),
      insert: (row) => drizzle.insertActivity(db, row),
      update: (t, id, patch) =>
        drizzle.updateActivityInDrizzle(db, t, id, patch),
      delete: (t, id) => drizzle.deleteActivityInDrizzle(db, t, id),
    },
  };
}
