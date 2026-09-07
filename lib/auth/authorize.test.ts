import { describe, expect, it } from "vitest";
import { hashPassword } from "../db/password";
import { authorizeCredentials, type CredentialUser } from "./authorize";

const owner: CredentialUser = {
  id: "user-owner",
  email: "owner@atrium.local",
  passwordHash: "",
  tenantId: "tenant-owner",
  role: "owner",
};

describe("authorizeCredentials", () => {
  it("returns null for an unknown email without a user object", async () => {
    const result = await authorizeCredentials(
      { email: "nobody@atrium.local", password: "any-password" },
      {
        async findByEmail() {
          return null;
        },
      },
      async () => true,
    );

    expect(result).toBeNull();
  });

  it("returns null for a known email with a wrong password without a user object", async () => {
    const passwordHash = await hashPassword("owner-secret");
    const result = await authorizeCredentials(
      { email: owner.email, password: "wrong-password" },
      {
        async findByEmail(email) {
          return email === owner.email ? { ...owner, passwordHash } : null;
        },
      },
      async (plaintext, hash) => plaintext === "owner-secret" && hash === passwordHash,
    );

    expect(result).toBeNull();
  });

  it("returns id, email, tenantId, and role for a matching password", async () => {
    const passwordHash = await hashPassword("owner-secret");
    const result = await authorizeCredentials(
      { email: owner.email, password: "owner-secret" },
      {
        async findByEmail(email) {
          return email === owner.email ? { ...owner, passwordHash } : null;
        },
      },
      async (plaintext, hash) => plaintext === "owner-secret" && hash === passwordHash,
    );

    expect(result).toEqual({
      id: owner.id,
      email: owner.email,
      tenantId: owner.tenantId,
      role: owner.role,
    });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("ignores tenantId supplied in credentials", async () => {
    const passwordHash = await hashPassword("owner-secret");
    const result = await authorizeCredentials(
      {
        email: owner.email,
        password: "owner-secret",
        tenantId: "attacker-tenant",
      },
      {
        async findByEmail(email) {
          return email === owner.email ? { ...owner, passwordHash } : null;
        },
      },
      async () => true,
    );

    expect(result?.tenantId).toBe(owner.tenantId);
  });
});
