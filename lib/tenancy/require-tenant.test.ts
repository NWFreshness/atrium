import { describe, expect, it } from "vitest";
import { requireTenant } from "./index";

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

  it("ignores tenantId supplied in credentials", async () => {
    const result = await requireTenant(async () => ownerSession, {
      tenantId: "attacker-tenant",
    });

    expect(result.tenantId).toBe(ownerSession.user.tenantId);
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

  it("throws when the session role is not owner or demo", async () => {
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
