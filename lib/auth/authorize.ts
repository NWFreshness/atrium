import type { UserRole } from "../db/schema";

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

export async function authorizeCredentials(
  credentials: Record<string, unknown>,
  lookup: UserLookup,
  verify: PasswordVerifier,
): Promise<AuthorizedUser | null> {
  const email =
    typeof credentials.email === "string" ? credentials.email.trim() : "";
  const password =
    typeof credentials.password === "string" ? credentials.password : "";

  if (!email || !password) {
    return null;
  }

  const user = await lookup.findByEmail(email);
  if (!user) {
    return null;
  }

  const matches = await verify(password, user.passwordHash);
  if (!matches) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
  };
}
