"use server";

import { sessionTenant } from "../tenancy";
import { type ConnectionView } from "./connections";
import { type CreateConnectionInput } from "./queries";

import {
  listConnectionViewsIn,
  createConnectionIn,
  deleteConnectionIn,
} from "./connection-ops";

export async function listConnectionViewsAction(
  personId: string,
): Promise<ConnectionView[]> {
  return listConnectionViewsIn(await sessionTenant(), personId);
}

export async function createConnectionAction(input: CreateConnectionInput) {
  return createConnectionIn(await sessionTenant(), input);
}

export async function deleteConnectionAction(id: string) {
  return deleteConnectionIn(await sessionTenant(), id);
}
