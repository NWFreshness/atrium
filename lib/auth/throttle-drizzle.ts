import { eq } from "drizzle-orm";
import { getDb, type Database } from "../db";
import { authThrottles } from "../db/schema";
import type { ThrottleRow, ThrottleStore } from "./throttle";

export function createDrizzleThrottleStore(db: Database): ThrottleStore {
  const store: ThrottleStore = {
    async get(subject) {
      const [row] = await db
        .select({
          subject: authThrottles.subject,
          failedCount: authThrottles.failedCount,
          windowStartedAt: authThrottles.windowStartedAt,
        })
        .from(authThrottles)
        .where(eq(authThrottles.subject, subject))
        .limit(1);
      return row ?? null;
    },
    async put(row: ThrottleRow) {
      const existing = await store.get(row.subject);
      if (!existing) {
        await db.insert(authThrottles).values({
          subject: row.subject,
          failedCount: row.failedCount,
          windowStartedAt: row.windowStartedAt,
        });
        return;
      }
      await db
        .update(authThrottles)
        .set({
          failedCount: row.failedCount,
          windowStartedAt: row.windowStartedAt,
        })
        .where(eq(authThrottles.subject, row.subject));
    },
    async delete(subject) {
      await db.delete(authThrottles).where(eq(authThrottles.subject, subject));
    },
  };
  return store;
}

/** Resolves the database on first use so module load never calls `getDb()`. */
export function createLazyDrizzleThrottleStore(): ThrottleStore {
  return {
    async get(subject) {
      return createDrizzleThrottleStore(getDb()).get(subject);
    },
    async put(row) {
      return createDrizzleThrottleStore(getDb()).put(row);
    },
    async delete(subject) {
      return createDrizzleThrottleStore(getDb()).delete(subject);
    },
  };
}
