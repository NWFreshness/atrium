import { describe, expect, it } from "vitest";
import { hashPassword } from "../db/password";
import {
  authorizeCredentials,
  DUMMY_PASSWORD_HASH,
  type CredentialUser,
  type PasswordVerifier,
} from "./authorize";

const owner: CredentialUser = {
  id: "user-owner",
  email: "owner@atrium.local",
  passwordHash: "",
  tenantId: "tenant-owner",
  role: "owner",
};

function recordingVerify(impl: PasswordVerifier) {
  const hashes: string[] = [];
  const verify: PasswordVerifier = async (plaintext, hash) => {
    hashes.push(hash);
    return impl(plaintext, hash);
  };
  return { verify, hashes };
}

describe("DUMMY_PASSWORD_HASH", () => {
  it("is a bcrypt modular crypt, not a placeholder string", () => {
    expect(DUMMY_PASSWORD_HASH).toMatch(/^\$2[ab]\$\d{2}\$.{53}$/);
  });
});

describe("authorizeCredentials", () => {
  it("returns null for an unknown email without a user object", async () => {
    const { verify, hashes } = recordingVerify(async () => true);
    const result = await authorizeCredentials(
      { email: "nobody@atrium.local", password: "any-password" },
      {
        async findByEmail() {
          return null;
        },
      },
      verify,
    );

    expect(result).toBeNull();
    expect(hashes).toEqual([DUMMY_PASSWORD_HASH]);
  });

  it("does not call verify when email or password is empty", async () => {
    const { verify, hashes } = recordingVerify(async () => true);
    const missing = {
      async findByEmail() {
        return null;
      },
    };

    expect(
      await authorizeCredentials({ email: "", password: "x" }, missing, verify),
    ).toBeNull();
    expect(
      await authorizeCredentials(
        { email: "a@b.co", password: "" },
        missing,
        verify,
      ),
    ).toBeNull();
    expect(hashes).toEqual([]);
  });

  it("returns null for a known email with a wrong password without a user object", async () => {
    const passwordHash = await hashPassword("owner-secret");
    const { verify, hashes } = recordingVerify(
      async (plaintext, hash) =>
        plaintext === "owner-secret" && hash === passwordHash,
    );
    const result = await authorizeCredentials(
      { email: owner.email, password: "wrong-password" },
      {
        async findByEmail(email) {
          return email === owner.email ? { ...owner, passwordHash } : null;
        },
      },
      verify,
    );

    expect(result).toBeNull();
    expect(hashes).toEqual([passwordHash]);
  });

  it("returns id, email, tenantId, and role for a matching password", async () => {
    const passwordHash = await hashPassword("owner-secret");
    const { verify, hashes } = recordingVerify(
      async (plaintext, hash) =>
        plaintext === "owner-secret" && hash === passwordHash,
    );
    const result = await authorizeCredentials(
      { email: owner.email, password: "owner-secret" },
      {
        async findByEmail(email) {
          return email === owner.email ? { ...owner, passwordHash } : null;
        },
      },
      verify,
    );

    expect(result).toEqual({
      id: owner.id,
      email: owner.email,
      tenantId: owner.tenantId,
      role: owner.role,
    });
    expect(result).not.toHaveProperty("passwordHash");
    expect(hashes).toEqual([passwordHash]);
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
