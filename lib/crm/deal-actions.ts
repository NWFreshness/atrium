"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { DEAL_STAGES, type DealStage } from "./constants";
import { moveDeal } from "./move-deal";
import {
  createDeal,
  deleteDeal,
  getContact,
  getDeal,
  getOrganization,
  listDeals,
  updateDeal,
  type CreateDealInput,
  type CrmRepository,
  type Deal,
  type ListDealsOpts,
  type UpdateDealInput,
} from "./queries";

type ClientTenantInput = {
  tenantId?: string;
};

function isDealStage(value: unknown): value is DealStage {
  return (
    typeof value === "string" &&
    (DEAL_STAGES as readonly string[]).includes(value)
  );
}

async function requireSessionOrganization(
  tenantId: string,
  organizationId: string | null | undefined,
  repo?: CrmRepository,
): Promise<boolean> {
  if (!organizationId) {
    return true;
  }
  const org = await getOrganization(tenantId, organizationId, repo);
  return org !== null;
}

async function requireSessionContact(
  tenantId: string,
  contactId: string | null | undefined,
  repo?: CrmRepository,
): Promise<boolean> {
  if (!contactId) {
    return true;
  }
  const contact = await getContact(tenantId, contactId, repo);
  return contact !== null;
}

export async function listDealsForSession(
  getSession: GetSession,
  input: ListDealsOpts & ClientTenantInput = {},
  repo?: CrmRepository,
): Promise<Deal[]> {
  const { tenantId } = await requireTenant(getSession, input);
  return listDeals(tenantId, repo, {
    q: input.q,
    organizationId: input.organizationId,
    contactId: input.contactId,
  });
}

export async function getDealForSession(
  getSession: GetSession,
  id: string,
  repo?: CrmRepository,
): Promise<Deal | null> {
  const { tenantId } = await requireTenant(getSession);
  return getDeal(tenantId, id, repo);
}

export async function createDealForSession(
  getSession: GetSession,
  input: CreateDealInput & ClientTenantInput,
  repo?: CrmRepository,
): Promise<Deal | null> {
  const { tenantId } = await requireTenant(getSession, input);
  if (!isDealStage(input.stage)) {
    return null;
  }
  if (
    !(await requireSessionOrganization(tenantId, input.organizationId, repo))
  ) {
    return null;
  }
  if (!(await requireSessionContact(tenantId, input.contactId, repo))) {
    return null;
  }
  return createDeal(tenantId, input, repo);
}

export async function updateDealForSession(
  getSession: GetSession,
  id: string,
  input: UpdateDealInput & ClientTenantInput,
  repo?: CrmRepository,
): Promise<Deal | null> {
  const { tenantId } = await requireTenant(getSession, input);
  if (input.stage !== undefined && !isDealStage(input.stage)) {
    return null;
  }
  if (
    input.organizationId !== undefined &&
    !(await requireSessionOrganization(tenantId, input.organizationId, repo))
  ) {
    return null;
  }
  if (
    input.contactId !== undefined &&
    !(await requireSessionContact(tenantId, input.contactId, repo))
  ) {
    return null;
  }
  return updateDeal(tenantId, id, input, repo);
}

export async function deleteDealForSession(
  getSession: GetSession,
  id: string,
  repo?: CrmRepository,
): Promise<Deal | null> {
  const { tenantId } = await requireTenant(getSession);
  return deleteDeal(tenantId, id, repo);
}

export async function moveDealForSession(
  getSession: GetSession,
  id: string,
  stage: DealStage,
  index?: number,
  repo?: CrmRepository,
): Promise<Deal | null> {
  const { tenantId } = await requireTenant(getSession);
  if (!isDealStage(stage)) {
    return null;
  }
  return moveDeal(tenantId, id, stage, index, repo);
}

export async function listDealsAction(opts?: ListDealsOpts): Promise<Deal[]> {
  const { auth } = await import("@/auth");
  return listDealsForSession(auth, opts ?? {});
}

export async function getDealAction(id: string): Promise<Deal | null> {
  const { auth } = await import("@/auth");
  return getDealForSession(auth, id);
}

export async function createDealAction(
  input: CreateDealInput,
): Promise<Deal | null> {
  const { auth } = await import("@/auth");
  return createDealForSession(auth, input);
}

export async function updateDealAction(
  id: string,
  input: UpdateDealInput,
): Promise<Deal | null> {
  const { auth } = await import("@/auth");
  return updateDealForSession(auth, id, input);
}

export async function deleteDealAction(id: string): Promise<Deal | null> {
  const { auth } = await import("@/auth");
  return deleteDealForSession(auth, id);
}

export async function moveDealAction(
  id: string,
  stage: DealStage,
  index?: number,
): Promise<Deal | null> {
  const { auth } = await import("@/auth");
  return moveDealForSession(auth, id, stage, index);
}
