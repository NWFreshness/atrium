"use server";

import { sessionTenant } from "../tenancy";
import { type CreateGiftInput } from "./queries";

import { listGiftsIn, createGiftIn, deleteGiftIn } from "./gift-ops";

export async function listGiftsAction(personId?: string) {
  return listGiftsIn(await sessionTenant(), { personId });
}

export async function createGiftAction(input: CreateGiftInput) {
  return createGiftIn(await sessionTenant(), input);
}

export async function deleteGiftAction(id: string) {
  return deleteGiftIn(await sessionTenant(), id);
}
