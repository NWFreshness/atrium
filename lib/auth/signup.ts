import { sql } from "drizzle-orm";
import { getDb, type Database } from "../db";
import { hashPassword } from "../db/password";
import { tenants, users, type UserRole } from "../db/schema";

export const MIN_PASSWORD_LENGTH = 12;
/** bcrypt truncates its input at 72 bytes, so anything longer would alias. */
export const MAX_PASSWORD_BYTES = 72;

export type SignUpErrorCode =
  | "closed"
  | "invalid_email"
  | "weak_password"
  | "password_too_long"
  | "unavailable";

/**
 * One code per failure the caller can act on. `unavailable` deliberately covers
 * "that email already has an account": the signup form must not tell an
 * anonymous visitor which addresses are registered.
 */
export class SignUpError extends Error {
  readonly code: SignUpErrorCode;

  constructor(code: SignUpErrorCode) {
    super(code);
    this.name = "SignUpError";
    this.code = code;
  }
}

/**
 * Only the literal string "true" opens signup. Missing, empty, "1" and "TRUE"
 * all mean closed, so a misconfigured deploy fails closed rather than serving
 * an open registration form.
 */
export function isSignupEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return env.AUTH_SIGNUP_ENABLED === "true";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** Trimmed, and required to look like an address. Case is preserved. */
export function normalizeEmail(email: unknown): string {
  const value = typeof email === "string" ? email.trim() : "";
  if (!EMAIL_PATTERN.test(value)) {
    throw new SignUpError("invalid_email");
  }
  return value;
}

/**
 * Length only — no composition rules. The upper bound is the bcrypt input
 * limit: beyond 72 bytes the hash stops seeing the tail, so two different long
 * passwords would verify against each other.
 */
export function assertPasswordStrength(password: unknown): string {
  const value = typeof password === "string" ? password : "";
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new SignUpError("weak_password");
  }
  if (Buffer.byteLength(value, "utf8") > MAX_PASSWORD_BYTES) {
    throw new SignUpError("password_too_long");
  }
  return value;
}

export type MemberUser = {
  id: string;
  email: string;
  tenantId: string;
  role: UserRole;
};

export type SignUpRepository = {
  /**
   * Case-insensitive: `Tyler@Example.com` and `tyler@example.com` are the same
   * mailbox. Login is exact-match, so letting both through would create two
   * accounts that can never be reconciled (there is no password reset).
   */
  findByEmail(email: string): Promise<{ id: string } | null>;
  /**
   * Creates the tenant and the member together. Email is unique in `users` and
   * is also the tenant name, so a conflict can only mean "already registered".
   */
  createMember(input: {
    email: string;
    passwordHash: string;
  }): Promise<MemberUser>;
};

export type SignUpDeps = {
  env: Record<string, string | undefined>;
  repo: SignUpRepository;
  hash?: (plaintext: string) => Promise<string>;
};

export async function signUp(
  input: { email: unknown; password: unknown },
  deps: SignUpDeps,
): Promise<MemberUser> {
  if (!isSignupEnabled(deps.env)) {
    throw new SignUpError("closed");
  }

  const email = normalizeEmail(input.email);
  const password = assertPasswordStrength(input.password);

  // Read the repo once: `createDefaultSignUpDeps` builds it lazily, so accessing
  // `deps.repo` per statement would create a second Neon client mid-signup.
  const repo = deps.repo;

  if (await repo.findByEmail(email)) {
    throw new SignUpError("unavailable");
  }

  const hash = deps.hash ?? hashPassword;
  const passwordHash = await hash(password);

  return repo.createMember({ email, passwordHash });
}

export type MemorySignUpRepository = SignUpRepository & {
  tenants: { id: string; name: string }[];
  users: (MemberUser & { passwordHash: string })[];
};

export function createMemorySignUpRepository(): MemorySignUpRepository {
  const tenants: MemorySignUpRepository["tenants"] = [];
  const users: MemorySignUpRepository["users"] = [];

  return {
    tenants,
    users,
    async findByEmail(email) {
      const user = users.find(
        (entry) => entry.email.toLowerCase() === email.toLowerCase(),
      );
      return user ? { id: user.id } : null;
    },
    async createMember({ email, passwordHash }) {
      if (
        users.some((entry) => entry.email.toLowerCase() === email.toLowerCase())
      ) {
        throw new SignUpError("unavailable");
      }

      // Both rows are built before either list is touched, so a rejected
      // member never leaves a tenant behind.
      const tenantId = crypto.randomUUID();
      const member: MemberUser & { passwordHash: string } = {
        id: crypto.randomUUID(),
        email,
        tenantId,
        role: "member",
        passwordHash,
      };

      tenants.push({ id: tenantId, name: email });
      users.push(member);

      return {
        id: member.id,
        email: member.email,
        tenantId: member.tenantId,
        role: member.role,
      };
    },
  };
}

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as { code?: unknown; message?: unknown };
  if (candidate.code === UNIQUE_VIOLATION) {
    return true;
  }
  return (
    typeof candidate.message === "string" &&
    candidate.message.includes("duplicate key value")
  );
}

/**
 * Neon's HTTP driver has no interactive `transaction()`, but `batch()` sends
 * every statement in one transaction, so the tenant and the member are all or
 * nothing.
 *
 * The email lookup is case-insensitive on purpose: the `users_email_unique`
 * index is not, and login is exact-match, so a case-variant duplicate would be
 * a second account nobody can merge or delete.
 */
export function createDrizzleSignUpRepository(db: Database): SignUpRepository {
  return {
    async findByEmail(email) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
        .limit(1);

      return user ?? null;
    },
    async createMember({ email, passwordHash }) {
      const tenantId = crypto.randomUUID();

      try {
        const [tenantRows, userRows] = await db.batch([
          db
            .insert(tenants)
            .values({ id: tenantId, name: email })
            .returning({ id: tenants.id }),
          db
            .insert(users)
            .values({ email, passwordHash, tenantId, role: "member" })
            .returning({
              id: users.id,
              email: users.email,
              tenantId: users.tenantId,
              role: users.role,
            }),
        ]);

        if (!tenantRows[0] || !userRows[0]) {
          throw new Error("Failed to create member");
        }
        return userRows[0];
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new SignUpError("unavailable");
        }
        throw error;
      }
    },
  };
}

/**
 * Lazily builds the Drizzle repo so a closed signup never needs a database
 * handle: `signUp` checks the flag before it touches `deps.repo`, and a
 * `getDb()` call up front would throw "DATABASE_URL is required" instead of the
 * intended `SignUpError("closed")`.
 */
export function createDefaultSignUpDeps(): SignUpDeps {
  return {
    env: process.env,
    get repo() {
      return createDrizzleSignUpRepository(getDb());
    },
  };
}
