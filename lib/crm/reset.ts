import { registerDemoResetter } from "../tenancy/reset-demo";
import {
  deleteActivity,
  deleteContact,
  deleteDeal,
  deleteOrganization,
  listActivities,
  listContacts,
  listDeals,
  listOrganizations,
  type CrmRepository,
} from "./queries";
import { seedCrm } from "./seed";

function isCrmRepository(value: unknown): value is CrmRepository {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as CrmRepository;
  return (
    Array.isArray(candidate.organizations) &&
    Array.isArray(candidate.contacts) &&
    Array.isArray(candidate.deals) &&
    Array.isArray(candidate.activities)
  );
}

export async function resetCrm(
  tx: unknown,
  tenantId: string,
  repo?: CrmRepository,
): Promise<void> {
  const store = isCrmRepository(tx) ? tx : repo;

  for (const row of await listActivities(tenantId, store)) {
    await deleteActivity(tenantId, row.id, store);
  }
  for (const row of await listDeals(tenantId, store)) {
    await deleteDeal(tenantId, row.id, store);
  }
  for (const row of await listContacts(tenantId, store)) {
    await deleteContact(tenantId, row.id, store);
  }
  for (const row of await listOrganizations(tenantId, store)) {
    await deleteOrganization(tenantId, row.id, store);
  }

  await seedCrm(tenantId, store);
}

export function registerCrmDemoResetter(repo?: CrmRepository): void {
  registerDemoResetter(async (tx, tenantId) => {
    await resetCrm(tx, tenantId, repo);
  });
}

registerCrmDemoResetter();
