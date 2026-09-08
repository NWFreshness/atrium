import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { registerDemoResetter } from "../tenancy/reset-demo";
import { type SpaceRepository } from "./queries";
import {
  blocks,
  pages,
  properties,
  propertyOptions,
  rowValues,
  views,
} from "./schema";
import { seedSpace } from "./seed";

function isSpaceRepository(value: unknown): value is SpaceRepository {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as SpaceRepository;
  return (
    Array.isArray(candidate.pages) &&
    Array.isArray(candidate.blocks) &&
    Array.isArray(candidate.properties) &&
    Array.isArray(candidate.propertyOptions) &&
    Array.isArray(candidate.rowValues) &&
    Array.isArray(candidate.views)
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
  repo?: SpaceRepository,
): Promise<void> {
  if (repo) {
    wipeTenant(repo.views, tenantId);
    wipeTenant(repo.rowValues, tenantId);
    wipeTenant(repo.propertyOptions, tenantId);
    wipeTenant(repo.properties, tenantId);
    wipeTenant(repo.blocks, tenantId);
    wipeTenant(repo.pages, tenantId);
    return;
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("Space store required");
  }
  const db = getDb();
  await db.delete(views).where(eq(views.tenantId, tenantId));
  await db.delete(rowValues).where(eq(rowValues.tenantId, tenantId));
  await db
    .delete(propertyOptions)
    .where(eq(propertyOptions.tenantId, tenantId));
  await db.delete(properties).where(eq(properties.tenantId, tenantId));
  await db.delete(blocks).where(eq(blocks.tenantId, tenantId));
  await db.delete(pages).where(eq(pages.tenantId, tenantId));
}

export async function resetSpace(
  tx: unknown,
  tenantId: string,
  repo?: SpaceRepository,
): Promise<void> {
  const store = isSpaceRepository(tx) ? tx : repo;
  await deleteTenantRows(tenantId, store);
  await seedSpace(tenantId, store);
}

export function registerSpaceDemoResetter(repo?: SpaceRepository): void {
  registerDemoResetter(async (tx, tenantId) => {
    await resetSpace(tx, tenantId, repo);
  });
}

registerSpaceDemoResetter();
