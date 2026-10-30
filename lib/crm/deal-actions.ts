"use server";

import { toResult, type ActionResult } from "../input/result";
import { sessionTenant } from "../tenancy";
import type { DealStage } from "./constants";
import {
  type CascadePreview,
  type CreateDealInput,
  type Deal,
  type ListDealsOpts,
  type UpdateDealInput,
} from "./queries";

import {
  listDealsIn,
  getDealIn,
  createDealIn,
  updateDealIn,
  deleteDealIn,
  dealCascadePreviewIn,
  moveDealIn,
} from "./deal-ops";

export async function listDealsAction(opts?: ListDealsOpts): Promise<Deal[]> {
  return listDealsIn(await sessionTenant(), opts ?? {});
}

export async function getDealAction(id: string): Promise<Deal | null> {
  return getDealIn(await sessionTenant(), id);
}

export async function createDealAction(
  input: CreateDealInput,
): Promise<ActionResult<Deal>> {
  return toResult(async () => createDealIn(await sessionTenant(), input));
}

export async function updateDealAction(
  id: string,
  input: UpdateDealInput,
): Promise<ActionResult<Deal>> {
  return toResult(async () => updateDealIn(await sessionTenant(), id, input));
}

export async function deleteDealAction(
  id: string,
): Promise<ActionResult<Deal>> {
  return toResult(async () => deleteDealIn(await sessionTenant(), id));
}

export async function dealCascadePreviewAction(
  id: string,
): Promise<CascadePreview> {
  return dealCascadePreviewIn(await sessionTenant(), id);
}

export async function moveDealAction(
  id: string,
  stage: DealStage,
  index?: number,
): Promise<ActionResult<Deal>> {
  return toResult(async () =>
    moveDealIn(await sessionTenant(), id, stage, index),
  );
}
