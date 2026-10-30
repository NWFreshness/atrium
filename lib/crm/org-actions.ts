"use server";

import { toResult, type ActionResult } from "../input/result";
import { sessionTenant } from "../tenancy";
import {
  type CascadePreview,
  type CreateOrganizationInput,
  type Organization,
  type UpdateOrganizationInput,
} from "./queries";

import {
  listOrganizationsIn,
  getOrganizationIn,
  createOrganizationIn,
  updateOrganizationIn,
  deleteOrganizationIn,
  organizationCascadePreviewIn,
} from "./org-ops";

export async function listOrganizationsAction(
  q?: string,
): Promise<Organization[]> {
  return listOrganizationsIn(await sessionTenant(), { q });
}

export async function getOrganizationAction(
  id: string,
): Promise<Organization | null> {
  return getOrganizationIn(await sessionTenant(), id);
}

export async function createOrganizationAction(
  input: CreateOrganizationInput,
): Promise<ActionResult<Organization>> {
  return toResult(async () =>
    createOrganizationIn(await sessionTenant(), input),
  );
}

export async function updateOrganizationAction(
  id: string,
  input: UpdateOrganizationInput,
): Promise<ActionResult<Organization>> {
  return toResult(async () =>
    updateOrganizationIn(await sessionTenant(), id, input),
  );
}

export async function deleteOrganizationAction(
  id: string,
): Promise<ActionResult<Organization>> {
  return toResult(async () => deleteOrganizationIn(await sessionTenant(), id));
}

export async function organizationCascadePreviewAction(
  id: string,
): Promise<CascadePreview> {
  return organizationCascadePreviewIn(await sessionTenant(), id);
}
