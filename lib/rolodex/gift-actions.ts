"use server";

import { requireTenant, type GetSession } from "../tenancy";
import { GIFT_KINDS, type GiftKind } from "./constants";
import { giftIdeasToSurface } from "./gifts";
import {
  createGift,
  deleteGift,
  getPerson,
  listGifts,
  listImportantDates,
  type CreateGiftInput,
  type RolodexRepository,
} from "./queries";

type ClientTenantInput = { tenantId?: string };

function isGiftKind(value: unknown): value is GiftKind {
  return (
    typeof value === "string" &&
    (GIFT_KINDS as readonly string[]).includes(value)
  );
}

async function requireSessionPerson(
  tenantId: string,
  personId: string,
  repo?: RolodexRepository,
) {
  return (await getPerson(tenantId, personId, repo)) !== null;
}

export async function listGiftsForSession(
  getSession: GetSession,
  input: { personId?: string } & ClientTenantInput = {},
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  return listGifts(tenantId, repo, { personId: input.personId });
}

export async function createGiftForSession(
  getSession: GetSession,
  input: CreateGiftInput & ClientTenantInput,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession, input);
  if (!isGiftKind(input.kind)) {
    throw new Error("Invalid gift kind");
  }
  if (!(await requireSessionPerson(tenantId, input.personId, repo))) {
    throw new Error("Person not found");
  }
  return createGift(tenantId, input, repo);
}

export async function deleteGiftForSession(
  getSession: GetSession,
  id: string,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession);
  return deleteGift(tenantId, id, repo);
}

export async function listGiftIdeasToSurfaceForSession(
  getSession: GetSession,
  personId: string,
  today: string,
  repo?: RolodexRepository,
) {
  const { tenantId } = await requireTenant(getSession);
  const [gifts, dates] = await Promise.all([
    listGifts(tenantId, repo, { personId }),
    listImportantDates(tenantId, repo, { personId }),
  ]);
  return giftIdeasToSurface(gifts, dates, today);
}

export async function listGiftsAction(personId?: string) {
  const { auth } = await import("@/auth");
  return listGiftsForSession(auth, { personId });
}

export async function createGiftAction(input: CreateGiftInput) {
  const { auth } = await import("@/auth");
  return createGiftForSession(auth, input);
}

export async function deleteGiftAction(id: string) {
  const { auth } = await import("@/auth");
  return deleteGiftForSession(auth, id);
}
