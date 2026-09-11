import { eq } from "drizzle-orm";
import { getDb, type Database } from "../db";
import { hashPassword, verifyPassword } from "../db/password";
import { users } from "../db/schema";
import type { PasswordVerifier } from "./authorize";
import { MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH } from "./signup";

export type ChangePasswordErrorCode =
  | "wrong_current"
  | "weak_password"
  | "password_too_long"
  | "unchanged"
  | "unavailable";

/**
 * One code per outcome the form can act on. `wrong_current` is also what a
 * missing user raises: the caller is already signed in, so distinguishing "no
 * such id" from "wrong password" would only add a second branch to get wrong.
 */
export class ChangePasswordError extends Error {
  readonly code: ChangePasswordErrorCode;

  constructor(code: ChangePasswordErrorCode) {
    super(code);
    this.name = "ChangePasswordError";
    this.code = code;
  }
}

export type PasswordUser = {
  id: string;
  passwordHash: string;
};

export type ChangePasswordRepository = {
  /** By id only — never by email, never by a client-supplied tenant. */
  findById(userId: string): Promise<PasswordUser | null>;
  /** Writes the hash and nothing else. False when no row matched. */
  updatePasswordHash(userId: string, passwordHash: string): Promise<boolean>;
};

export type ChangePasswordDeps = {
  repo: ChangePasswordRepository;
  verify?: PasswordVerifier;
  hash?: (plaintext: string) => Promise<string>;
};

/**
 * Rewrites one user's bcrypt hash after they prove the current password.
 *
 * The session JWT is deliberately left alone: it is stateless, so there is
 * nothing to revoke, and a successful change does not sign this device — or any
 * other — out. See the feature's Shipped notes.
 */
export async function changePassword(
  userId: string,
  input: { current: unknown; next: unknown },
  deps: ChangePasswordDeps,
): Promise<void> {
  // Read the repo once so a lazy `createDefaultChangePasswordDeps()` builds one
  // Neon client rather than one per statement.
  const repo = deps.repo;

  const user = await repo.findById(userId);
  if (!user) {
    throw new ChangePasswordError("wrong_current");
  }

  const current = typeof input.current === "string" ? input.current : "";
  const next = typeof input.next === "string" ? input.next : "";

  // Identity first: a weak `next` must not be reported to someone who has not
  // proved they hold the current password.
  const verify = deps.verify ?? verifyPassword;
  if (!current || !(await verify(current, user.passwordHash))) {
    throw new ChangePasswordError("wrong_current");
  }

  // Before the length rules, so a user who repeats their existing password is
  // told that instead of "too short" about a password they are already using.
  if (next === current) {
    throw new ChangePasswordError("unchanged");
  }

  // The 6.1 rules, not a second policy: length only, with the upper bound set
  // by bcrypt's 72-byte input truncation.
  if (next.length < MIN_PASSWORD_LENGTH) {
    throw new ChangePasswordError("weak_password");
  }
  if (Buffer.byteLength(next, "utf8") > MAX_PASSWORD_BYTES) {
    throw new ChangePasswordError("password_too_long");
  }

  const hash = deps.hash ?? hashPassword;
  const passwordHash = await hash(next);

  if (!(await repo.updatePasswordHash(userId, passwordHash))) {
    // The row vanished between the read and the write. Reporting success would
    // leave the form claiming a password that never landed.
    throw new ChangePasswordError("unavailable");
  }
}

export type MemoryChangePasswordRepository = ChangePasswordRepository & {
  users: PasswordUser[];
};

export function createMemoryChangePasswordRepository(
  seed: PasswordUser[] = [],
): MemoryChangePasswordRepository {
  const users = seed.map((user) => ({ ...user }));

  return {
    users,
    async findById(userId) {
      return users.find((user) => user.id === userId) ?? null;
    },
    async updatePasswordHash(userId, passwordHash) {
      const user = users.find((entry) => entry.id === userId);
      if (!user) {
        return false;
      }
      user.passwordHash = passwordHash;
      return true;
    },
  };
}

export function createDrizzleChangePasswordRepository(
  db: Database,
): ChangePasswordRepository {
  return {
    async findById(userId) {
      const [user] = await db
        .select({ id: users.id, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return user ?? null;
    },
    async updatePasswordHash(userId, passwordHash) {
      const rows = await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, userId))
        .returning({ id: users.id });

      return rows.length > 0;
    },
  };
}

/**
 * Lazily builds the Drizzle repo, matching `createDefaultSignUpDeps`: the caller
 * checks the session before touching `deps.repo`, and an eager `getDb()` would
 * throw "DATABASE_URL is required" from an unauthenticated request.
 */
export function createDefaultChangePasswordDeps(): ChangePasswordDeps {
  return {
    get repo() {
      return createDrizzleChangePasswordRepository(getDb());
    },
  };
}
