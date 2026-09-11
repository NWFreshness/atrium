import { STAGE_PROBABILITY, type DealStage } from "./constants";
import {
  createActivity,
  createContact,
  createDeal,
  createOrganization,
  listOrganizations,
  type CrmRepository,
} from "./queries";
import type { WriteOpts } from "../db/batch-transaction";

export async function seedCrm(
  tenantId: string,
  repo?: CrmRepository,
  opts?: WriteOpts,
): Promise<void> {
  // A reset collects the wipe and this reseed into one batch, so the
  // rows are still there to be found: the idempotence check only applies
  // to a standalone seed (`npm run db:seed`), which runs immediately.
  if (!opts?.batch) {
    const existing = await listOrganizations(tenantId, repo);
    if (existing.length > 0) {
      return;
    }
  }

  const northwind = await createOrganization(
    tenantId,
    {
      name: "Northwind Logistics",
      website: "https://northwind.example",
      industry: "Logistics",
    },
    repo,
    opts,
  );
  const bluepeak = await createOrganization(
    tenantId,
    {
      name: "Bluepeak Software",
      website: "https://bluepeak.example",
      industry: "Software",
    },
    repo,
    opts,
  );
  const harbor = await createOrganization(
    tenantId,
    {
      name: "Harbor & Lane",
      website: "https://harborandlane.example",
      industry: "Professional services",
    },
    repo,
    opts,
  );

  const ana = await createContact(
    tenantId,
    {
      name: "Ana Ruiz",
      email: "ana.ruiz@northwind.example",
      jobTitle: "VP Operations",
      organizationId: northwind.id,
      status: "customer",
    },
    repo,
    opts,
  );
  const marcus = await createContact(
    tenantId,
    {
      name: "Marcus Chen",
      email: "marcus.chen@bluepeak.example",
      jobTitle: "CTO",
      organizationId: bluepeak.id,
      status: "qualified",
    },
    repo,
    opts,
  );
  const priya = await createContact(
    tenantId,
    {
      name: "Priya Shah",
      email: "priya.shah@harborandlane.example",
      jobTitle: "Managing Partner",
      organizationId: harbor.id,
      status: "lead",
    },
    repo,
    opts,
  );
  const jordan = await createContact(
    tenantId,
    {
      name: "Jordan Hale",
      email: "jordan.hale@bluepeak.example",
      jobTitle: "Head of Sales",
      organizationId: bluepeak.id,
      status: "qualified",
    },
    repo,
    opts,
  );

  async function deal(input: {
    name: string;
    organizationId: string;
    contactId: string;
    stage: DealStage;
    value: number;
    boardOrder: number;
  }) {
    return createDeal(
      tenantId,
      {
        ...input,
        probability: STAGE_PROBABILITY[input.stage],
      },
      repo,
      opts,
    );
  }

  const fleet = await deal({
    name: "Northwind fleet tracking",
    organizationId: northwind.id,
    contactId: ana.id,
    stage: "Won",
    value: 48000,
    boardOrder: 0,
  });
  const warehouse = await deal({
    name: "Northwind warehouse rollout",
    organizationId: northwind.id,
    contactId: ana.id,
    stage: "Negotiation",
    value: 32000,
    boardOrder: 0,
  });
  const platform = await deal({
    name: "Bluepeak platform license",
    organizationId: bluepeak.id,
    contactId: marcus.id,
    stage: "Proposal",
    value: 75000,
    boardOrder: 0,
  });
  await deal({
    name: "Bluepeak onboarding workshop",
    organizationId: bluepeak.id,
    contactId: jordan.id,
    stage: "Lost",
    value: 9000,
    boardOrder: 0,
  });
  await deal({
    name: "Harbor & Lane advisory retainer",
    organizationId: harbor.id,
    contactId: priya.id,
    stage: "Qualified",
    value: 18000,
    boardOrder: 0,
  });
  await deal({
    name: "Harbor & Lane intake",
    organizationId: harbor.id,
    contactId: priya.id,
    stage: "New",
    value: 5000,
    boardOrder: 0,
  });

  await createActivity(
    tenantId,
    {
      type: "note",
      contactId: ana.id,
      dealId: fleet.id,
      description: "Signed annual fleet tracking contract.",
      occurredAt: new Date("2026-01-15T15:00:00.000Z"),
      done: true,
    },
    repo,
    opts,
  );
  await createActivity(
    tenantId,
    {
      type: "call",
      contactId: ana.id,
      dealId: warehouse.id,
      description: "Follow-up on warehouse rollout timeline.",
      occurredAt: new Date("2026-02-03T18:30:00.000Z"),
      done: true,
    },
    repo,
    opts,
  );
  await createActivity(
    tenantId,
    {
      type: "email",
      contactId: marcus.id,
      dealId: platform.id,
      description: "Sent proposal for platform license.",
      occurredAt: new Date("2026-02-10T14:00:00.000Z"),
      done: true,
    },
    repo,
    opts,
  );
  await createActivity(
    tenantId,
    {
      type: "note",
      contactId: priya.id,
      description: "Intro call scheduled for next week.",
      dueDate: new Date("2026-03-01T17:00:00.000Z"),
      done: false,
    },
    repo,
    opts,
  );
}
