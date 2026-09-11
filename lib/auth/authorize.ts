import type { UserRole } from "../db/schema";
import {
  assertNotThrottled,
  clearFailures,
  recordFailure,
  type ThrottleClock,
  type ThrottleStore,
} from "./throttle";

export type CredentialUser = {
  id: string;
  email: string;
  passwordHash: string;
  tenantId: string;
  role: UserRole;
};

export type AuthorizedUser = {
  id: string;
  email: string;
  tenantId: string;
  role: UserRole;
};

export type UserLookup = {
  findByEmail(email: string): Promise<CredentialUser | null>;
};

export type PasswordVerifier = (
  plaintext: string,
  passwordHash: string,
) => Promise<boolean>;

/**
 * bcrypt of a random secret that is not in this repo. Misses still run
 * `verify` against this hash so wall-clock time does not advertise which
 * emails exist. Do not hash a dummy inside `authorizeCredentials`.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$10$DI5h9kwGKjLt1lzzwe50JOg9hCBmIUr1uw3NxgO5NtH168HiHhsJe";

export type AuthorizeThrottle = {
  store: ThrottleStore;
  now?: ThrottleClock;
  ip?: string;
};

export async function authorizeCredentials(
  credentials: Record<string, unknown>,
  lookup: UserLookup,
  verify: PasswordVerifier,
  throttle?: AuthorizeThrottle,
): Promise<AuthorizedUser | null> {
  const email =
    typeof credentials.email === "string" ? credentials.email.trim() : "";
  const password =
    typeof credentials.password === "string" ? credentials.password : "";

  if (!email || !password) {
    return null;
  }

  const attempt = { email, ip: throttle?.ip };
  const clock = throttle?.now;

  if (throttle) {
    const gate = await assertNotThrottled(throttle.store, attempt, clock);
    if (!gate.ok) {
      return null;
    }
  }

  const user = await lookup.findByEmail(email);
  const matches = await verify(
    password,
    user ? user.passwordHash : DUMMY_PASSWORD_HASH,
  );
  if (!user || !matches) {
    if (throttle) {
      await recordFailure(throttle.store, attempt, clock);
    }
    return null;
  }

  if (throttle) {
    await clearFailures(throttle.store, attempt);
  }

  return {
    id: user.id,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
  };
}
