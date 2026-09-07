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
    typeof value === "string" && (userRoles as readonly string[]).includes(value)
  );
}

export async function requireTenant(
  getSession: GetSession,
  _client?: Record<string, unknown>,
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
