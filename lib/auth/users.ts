import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { users } from "../db/schema";
import type { CredentialUser } from "./authorize";

/**
 * Case-insensitive on both sides. Signup rejects a case-variant duplicate
 * (`lib/auth/signup.ts`), and it stores the address exactly as typed, so a
 * byte-exact lookup here would strand a member who signs up as
 * `Tyler@Example.com` and then types `tyler@example.com` — with no password
 * reset in this phase there is no way back in.
 */
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
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);

  return user ?? null;
}
