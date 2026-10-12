import { userRoles, type UserRole } from "../db/schema";

export type TenantContext = {
  userId: string;
  tenantId: string;
  role: UserRole;
};

type SessionUser = {
  id?: string;
  tenantId?: string;
  role?: unknown;
};

type SessionLike = {
  user?: SessionUser | null;
} | null;

export type GetSession = () => Promise<SessionLike>;

function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (userRoles as readonly string[]).includes(value)
  );
}

export async function requireTenant(
  getSession: GetSession,
): Promise<TenantContext> {
  const session = await getSession();
  const user = session?.user;

  if (!user?.id || !user.tenantId || !isUserRole(user.role)) {
    throw new Error("Unauthenticated");
  }

  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  };
}

/**
 * The signed-in tenant: read from the Auth.js session and from nowhere else.
 * Every server action resolves its tenant here, so no action has an input a
 * caller could use to name a different one.
 */
export async function sessionTenant(): Promise<string> {
  const { auth } = await import("@/auth");
  return (await requireTenant(auth)).tenantId;
}

/** Guards every tenant-scoped query: a blank tenant id must never reach a predicate. */
export function requireTenantId(tenantId: string): string {
  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new Error("tenantId is required");
  }
  return tenantId;
}
