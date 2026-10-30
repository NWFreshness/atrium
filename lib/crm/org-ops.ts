import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  listOrganizations,
  organizationCascadePreview,
  updateOrganization,
  type CascadePreview,
  type CreateOrganizationInput,
  type CrmStore,
  type Organization,
  type UpdateOrganizationInput,
} from "./queries";

export async function listOrganizationsIn(
  tenantId: string,
  input: { q?: string } = {},
  repo?: CrmStore,
): Promise<Organization[]> {
  return listOrganizations(tenantId, repo, input.q);
}

export async function getOrganizationIn(
  tenantId: string,
  id: string,
  repo?: CrmStore,
): Promise<Organization | null> {
  return getOrganization(tenantId, id, repo);
}

export async function createOrganizationIn(
  tenantId: string,
  input: CreateOrganizationInput,
  repo?: CrmStore,
): Promise<Organization> {
  return createOrganization(tenantId, input, repo);
}

export async function updateOrganizationIn(
  tenantId: string,
  id: string,
  input: UpdateOrganizationInput,
  repo?: CrmStore,
): Promise<Organization | null> {
  return updateOrganization(tenantId, id, input, repo);
}

export async function deleteOrganizationIn(
  tenantId: string,
  id: string,
  repo?: CrmStore,
): Promise<Organization | null> {
  return deleteOrganization(tenantId, id, repo);
}

export async function organizationCascadePreviewIn(
  tenantId: string,
  id: string,
  repo?: CrmStore,
): Promise<CascadePreview> {
  return organizationCascadePreview(tenantId, id, repo);
}
