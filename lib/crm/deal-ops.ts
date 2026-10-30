import type { DealStage } from "./constants";
import { moveDeal } from "./move-deal";
import {
  createDeal,
  dealCascadePreview,
  deleteDeal,
  getDeal,
  listDeals,
  updateDeal,
  type CascadePreview,
  type CreateDealInput,
  type CrmStore,
  type Deal,
  type ListDealsOpts,
  type UpdateDealInput,
} from "./queries";

export async function listDealsIn(
  tenantId: string,
  input: ListDealsOpts = {},
  repo?: CrmStore,
): Promise<Deal[]> {
  return listDeals(tenantId, repo, {
    q: input.q,
    organizationId: input.organizationId,
    contactId: input.contactId,
    stage: input.stage,
    closeAfter: input.closeAfter,
    closeBefore: input.closeBefore,
  });
}

export async function getDealIn(
  tenantId: string,
  id: string,
  repo?: CrmStore,
): Promise<Deal | null> {
  return getDeal(tenantId, id, repo);
}

export async function createDealIn(
  tenantId: string,
  input: CreateDealInput,
  repo?: CrmStore,
): Promise<Deal | null> {
  return createDeal(tenantId, input, repo);
}

export async function updateDealIn(
  tenantId: string,
  id: string,
  input: UpdateDealInput,
  repo?: CrmStore,
): Promise<Deal | null> {
  return updateDeal(tenantId, id, input, repo);
}

export async function deleteDealIn(
  tenantId: string,
  id: string,
  repo?: CrmStore,
): Promise<Deal | null> {
  return deleteDeal(tenantId, id, repo);
}

export async function dealCascadePreviewIn(
  tenantId: string,
  id: string,
  repo?: CrmStore,
): Promise<CascadePreview> {
  return dealCascadePreview(tenantId, id, repo);
}

export async function moveDealIn(
  tenantId: string,
  id: string,
  stage: DealStage,
  index?: number,
  repo?: CrmStore,
): Promise<Deal | null> {
  return moveDeal(tenantId, id, stage, index, repo);
}
