import { describe, expect, it, vi } from "vitest";
import { requireTenant, requireTenantId, sessionTenant } from "./index";

const auth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth }));

const ownerSession = {
  user: {
    id: "user-owner",
    tenantId: "tenant-owner",
    role: "owner" as const,
  },
};

describe("requireTenant", () => {
  it("returns userId, tenantId, and role from the session", async () => {
    const result = await requireTenant(async () => ownerSession);

    expect(result).toEqual({
      userId: "user-owner",
      tenantId: "tenant-owner",
      role: "owner",
    });
  });

  it("throws when unauthenticated", async () => {
    await expect(requireTenant(async () => null)).rejects.toThrow(
      "Unauthenticated",
    );
  });

  it("throws when the session lacks tenantId", async () => {
    await expect(
      requireTenant(async () => ({
        user: { id: "user-owner", role: "owner" },
      })),
    ).rejects.toThrow("Unauthenticated");
  });

  it("throws when the session lacks role", async () => {
    await expect(
      requireTenant(async () => ({
        user: { id: "user-owner", tenantId: "tenant-owner" },
      })),
    ).rejects.toThrow("Unauthenticated");
  });

  it("throws when the session lacks id", async () => {
    await expect(
      requireTenant(async () => ({
        user: { tenantId: "tenant-owner", role: "owner" },
      })),
    ).rejects.toThrow("Unauthenticated");
  });

  it("takes the tenant from the session and has no parameter to supply another", async () => {
    const result = await requireTenant(async () => ownerSession);

    expect(result.tenantId).toBe(ownerSession.user.tenantId);
    expect(requireTenant).toHaveLength(1);
  });

  it("returns demo role from the session", async () => {
    const result = await requireTenant(async () => ({
      user: {
        id: "user-demo",
        tenantId: "tenant-demo",
        role: "demo" as const,
      },
    }));

    expect(result).toEqual({
      userId: "user-demo",
      tenantId: "tenant-demo",
      role: "demo",
    });
  });

  it("returns member role from the session", async () => {
    const result = await requireTenant(async () => ({
      user: {
        id: "user-member",
        tenantId: "tenant-member",
        role: "member" as const,
      },
    }));

    expect(result).toEqual({
      userId: "user-member",
      tenantId: "tenant-member",
      role: "member",
    });
  });

  it("throws when the session role is not a known role", async () => {
    await expect(
      requireTenant(async () => ({
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          role: "admin",
        },
      })),
    ).rejects.toThrow("Unauthenticated");
  });
});

describe("requireTenantId", () => {
  it("returns a non-blank tenant id unchanged", () => {
    expect(requireTenantId("tenant-a")).toBe("tenant-a");
  });

  it("throws on a blank or missing tenant id", () => {
    expect(() => requireTenantId("")).toThrow("tenantId is required");
    expect(() => requireTenantId("   ")).toThrow("tenantId is required");
    expect(() => requireTenantId(undefined as unknown as string)).toThrow(
      "tenantId is required",
    );
  });
});

describe("sessionTenant", () => {
  it("returns the signed-in session's tenant", async () => {
    auth.mockResolvedValue(ownerSession);
    await expect(sessionTenant()).resolves.toBe("tenant-owner");
    expect(sessionTenant).toHaveLength(0);
  });

  it("throws when unauthenticated, so no action runs without a session", async () => {
    auth.mockResolvedValue(null);
    await expect(sessionTenant()).rejects.toThrow("Unauthenticated");
  });

  it("throws when the session carries no tenant", async () => {
    auth.mockResolvedValue({ user: { id: "user-owner", role: "owner" } });
    await expect(sessionTenant()).rejects.toThrow("Unauthenticated");
  });
});
