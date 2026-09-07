import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users } from "../db/schema";
import type { CredentialUser } from "./authorize";

export async function findUserByEmail(
  email: string,
): Promise<CredentialUser | null> {
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      tenantId: users.tenantId,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}
