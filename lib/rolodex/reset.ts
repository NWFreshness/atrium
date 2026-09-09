import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { registerDemoResetter } from "../tenancy/reset-demo";
import { type RolodexRepository } from "./queries";
import {
  connections,
  facts,
  gifts,
  importantDates,
  interactions,
  news,
  people,
  reminders,
} from "./schema";
import { seedRolodex } from "./seed";

function isRolodexRepository(value: unknown): value is RolodexRepository {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as RolodexRepository;
  return (
    Array.isArray(candidate.people) &&
    Array.isArray(candidate.interactions) &&
    Array.isArray(candidate.importantDates) &&
    Array.isArray(candidate.facts) &&
    Array.isArray(candidate.news) &&
    Array.isArray(candidate.reminders) &&
    Array.isArray(candidate.gifts) &&
    Array.isArray(candidate.connections)
  );
}

function wipeTenant<T extends { tenantId: string }>(
  rows: T[],
  tenantId: string,
): void {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i]!.tenantId === tenantId) {
      rows.splice(i, 1);
    }
  }
}

async function deleteTenantRows(
  tenantId: string,
  repo?: RolodexRepository,
): Promise<void> {
  if (repo) {
    wipeTenant(repo.connections, tenantId);
    wipeTenant(repo.gifts, tenantId);
    wipeTenant(repo.reminders, tenantId);
    wipeTenant(repo.news, tenantId);
    wipeTenant(repo.facts, tenantId);
    wipeTenant(repo.importantDates, tenantId);
    wipeTenant(repo.interactions, tenantId);
    wipeTenant(repo.people, tenantId);
    return;
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("Rolodex store required");
  }
  const db = getDb();
  await db.delete(connections).where(eq(connections.tenantId, tenantId));
  await db.delete(gifts).where(eq(gifts.tenantId, tenantId));
  await db.delete(reminders).where(eq(reminders.tenantId, tenantId));
  await db.delete(news).where(eq(news.tenantId, tenantId));
  await db.delete(facts).where(eq(facts.tenantId, tenantId));
  await db.delete(importantDates).where(eq(importantDates.tenantId, tenantId));
  await db.delete(interactions).where(eq(interactions.tenantId, tenantId));
  await db.delete(people).where(eq(people.tenantId, tenantId));
}

export async function resetRolodex(
  tx: unknown,
  tenantId: string,
  repo?: RolodexRepository,
): Promise<void> {
  const store = isRolodexRepository(tx) ? tx : repo;
  await deleteTenantRows(tenantId, store);
  await seedRolodex(tenantId, store);
}

export function registerRolodexDemoResetter(repo?: RolodexRepository): void {
  registerDemoResetter(async (tx, tenantId) => {
    await resetRolodex(tx, tenantId, repo);
  });
}

registerRolodexDemoResetter();
