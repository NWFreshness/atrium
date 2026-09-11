import { describe, expect, it } from "vitest";
import type { Database } from "../db";
import {
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  SignUpError,
  createDrizzleSignUpRepository,
  createMemorySignUpRepository,
  isSignupEnabled,
  signUp,
} from "./signup";

const OPEN = { AUTH_SIGNUP_ENABLED: "true" };

function harness(env: Record<string, string | undefined> = OPEN) {
  const repo = createMemorySignUpRepository();
  const hashed: string[] = [];
  // A stand-in that behaves like bcrypt: irreversible, fixed length, and it
  // records which plaintext it was asked to hash.
  const FAKE_HASH =
    "$2b$10$f4k3h4shf4k3h4shf4k3h4shf4k3h4shf4k3h4shf4k3h4shf4k3h4sh";
  return {
    repo,
    hashed,
    async create(input: { email: unknown; password: unknown }) {
      return signUp(input, {
        env,
        repo,
        hash: async (plaintext) => {
          hashed.push(plaintext);
          return FAKE_HASH;
        },
      });
    },
  };
}

async function codeOf(run: () => Promise<unknown>): Promise<string> {
  return (await errorOf(run)).code;
}

async function errorOf(run: () => Promise<unknown>): Promise<SignUpError> {
  try {
    await run();
  } catch (error) {
    if (error instanceof SignUpError) {
      return error;
    }
    throw error;
  }
  throw new Error("expected signUp to throw");
}

describe("isSignupEnabled", () => {
  it("is open only for the string true", () => {
    expect(isSignupEnabled({ AUTH_SIGNUP_ENABLED: "true" })).toBe(true);
  });

  it("is closed when missing, empty, or any other value", () => {
    expect(isSignupEnabled({})).toBe(false);
    expect(isSignupEnabled({ AUTH_SIGNUP_ENABLED: "" })).toBe(false);
    expect(isSignupEnabled({ AUTH_SIGNUP_ENABLED: "1" })).toBe(false);
    expect(isSignupEnabled({ AUTH_SIGNUP_ENABLED: "TRUE" })).toBe(false);
    expect(isSignupEnabled({ AUTH_SIGNUP_ENABLED: "false" })).toBe(false);
  });
});

describe("signUp", () => {
  it("creates a member tenant named after the trimmed email", async () => {
    const { create, repo } = harness();

    const member = await create({
      email: "  member@atrium.local  ",
      password: "correct horse battery",
    });

    expect(member.email).toBe("member@atrium.local");
    expect(member.role).toBe("member");
    expect(member.tenantId).toBeTruthy();
    expect(member.id).toBeTruthy();
    expect(repo.tenants).toEqual([
      { id: member.tenantId, name: "member@atrium.local" },
    ]);
  });

  it("hashes the password instead of storing it", async () => {
    const { create, repo, hashed } = harness();
    const password = "correct horse battery";

    const member = await create({ email: "hash@atrium.local", password });
    const stored = repo.users.find((user) => user.id === member.id);

    expect(hashed).toEqual([password]);
    expect(stored?.passwordHash).not.toBe(password);
    expect(stored?.passwordHash).not.toContain(password);
  });

  it("throws closed and writes nothing when the flag is off", async () => {
    const { create, repo, hashed } = harness({});

    expect(
      await codeOf(() =>
        create({ email: "closed@atrium.local", password: "long-enough-pass" }),
      ),
    ).toBe("closed");
    expect(repo.tenants).toEqual([]);
    expect(repo.users).toEqual([]);
    expect(hashed).toEqual([]);
  });

  it("rejects an empty email or one without an @", async () => {
    const { create, repo } = harness();

    for (const email of ["", "   ", "member", "member@", "@atrium.local"]) {
      expect(
        await codeOf(() => create({ email, password: "long-enough-pass" })),
      ).toBe("invalid_email");
    }

    expect(repo.users).toEqual([]);
  });

  it("requires at least 12 characters and accepts exactly 12", async () => {
    const { create } = harness();

    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(
      await codeOf(() =>
        create({ email: "weak@atrium.local", password: "a".repeat(11) }),
      ),
    ).toBe("weak_password");

    const member = await create({
      email: "ok@atrium.local",
      password: "a".repeat(12),
    });
    expect(member.role).toBe("member");
  });

  it("counts the minimum in code points, so six emoji do not clear it", async () => {
    const { create, repo } = harness();

    // Twelve UTF-16 units, six visible characters: this passed before 8.2.
    expect("\u{1F600}".repeat(6)).toHaveLength(12);
    expect(
      await codeOf(() =>
        create({
          email: "emoji@atrium.local",
          password: "\u{1F600}".repeat(6),
        }),
      ),
    ).toBe("weak_password");
    expect(repo.users).toEqual([]);

    // Twelve code points and 48 bytes clears both bounds.
    const member = await create({
      email: "emoji@atrium.local",
      password: "\u{1F600}".repeat(12),
    });
    expect(member.role).toBe("member");
  });

  it("rejects a password past the bcrypt byte limit instead of silently truncating", async () => {
    const { create, repo } = harness();

    expect(MAX_PASSWORD_BYTES).toBe(72);
    expect(
      await codeOf(() =>
        create({ email: "long@atrium.local", password: "a".repeat(73) }),
      ),
    ).toBe("password_too_long");

    // Multi-byte characters count by byte, not by UTF-16 unit.
    expect(
      await codeOf(() =>
        create({ email: "long@atrium.local", password: "é".repeat(40) }),
      ),
    ).toBe("password_too_long");

    expect(repo.users).toEqual([]);
  });

  it("treats a repeated email as unavailable and creates no second tenant", async () => {
    const { create, repo } = harness();
    const input = { email: "twice@atrium.local", password: "long-enough-pass" };

    await create(input);
    expect(await codeOf(() => create(input))).toBe("unavailable");

    expect(repo.tenants).toHaveLength(1);
    expect(repo.users).toHaveLength(1);
  });

  it("treats a differently-cased repeat as the same mailbox", async () => {
    const { create, repo } = harness();

    await create({ email: "Tyler@Example.com", password: "long-enough-pass" });
    expect(
      await codeOf(() =>
        create({ email: "tyler@example.com", password: "long-enough-pass" }),
      ),
    ).toBe("unavailable");

    expect(repo.tenants).toHaveLength(1);
    expect(repo.users.map((user) => user.email)).toEqual(["Tyler@Example.com"]);
  });

  it("stores the email verbatim while treating it as one mailbox", async () => {
    // Case is preserved (what the member typed is what they see), but the
    // duplicate check is case-insensitive, and login matches it on both sides —
    // see lib/auth/users.ts.
    const { create } = harness();

    const member = await create({
      email: "Member@Atrium.local",
      password: "long-enough-pass",
    });

    expect(member.email).toBe("Member@Atrium.local");
  });

  it("reports unavailable, never email-taken, so signup does not leak accounts", async () => {
    const { create } = harness();
    await create({ email: "leak@atrium.local", password: "long-enough-pass" });

    const error = await errorOf(() =>
      create({ email: "leak@atrium.local", password: "long-enough-pass" }),
    );

    expect(error.code).toBe("unavailable");
    expect(error.message.toLowerCase()).not.toContain("taken");
    expect(error.message.toLowerCase()).not.toContain("exists");
  });

  it("validates the flag before the email, so closed never confirms an account", async () => {
    const { create } = harness({});

    expect(
      await codeOf(() => create({ email: "taken", password: "short" })),
    ).toBe("closed");
  });
});

describe("createMemorySignUpRepository", () => {
  it("keeps the first member and tenant when the same email is inserted again", async () => {
    const repo = createMemorySignUpRepository();

    await expect(
      repo.createMember({ email: "race@atrium.local", passwordHash: "x" }),
    ).resolves.toMatchObject({ role: "member" });

    await expect(
      repo.createMember({ email: "race@atrium.local", passwordHash: "x" }),
    ).rejects.toThrow(SignUpError);

    expect(repo.tenants).toHaveLength(1);
    expect(repo.users).toHaveLength(1);
    expect(repo.users[0]?.passwordHash).toBe("x");
  });
});

/** A Database stand-in whose only job is to fail the way Neon fails. */
function stubDb(batch: () => Promise<never>): Database {
  const builder = { values: () => ({ returning: () => ({}) }) };
  return { insert: () => builder, batch } as unknown as Database;
}

function neonError(message: string, code?: string): Error {
  const error = new Error(message);
  if (code) {
    (error as Error & { code?: string }).code = code;
  }
  return error;
}

async function caught(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error("expected a throw");
}

describe("createDrizzleSignUpRepository", () => {
  const input = { email: "dupe@atrium.local", passwordHash: "hashed" };

  it("maps a Postgres 23505 to unavailable", async () => {
    const repo = createDrizzleSignUpRepository(
      stubDb(async () => {
        throw neonError(
          "duplicate key value violates unique constraint",
          "23505",
        );
      }),
    );

    const error = await caught(() => repo.createMember(input));

    expect(error).toBeInstanceOf(SignUpError);
    expect((error as SignUpError).code).toBe("unavailable");
  });

  it("maps a duplicate-key message to unavailable even when code is stripped", async () => {
    const repo = createDrizzleSignUpRepository(
      stubDb(async () => {
        throw neonError(
          'duplicate key value violates unique constraint "users_email_lower_idx"',
        );
      }),
    );

    const error = await caught(() => repo.createMember(input));

    expect(error).toBeInstanceOf(SignUpError);
    expect((error as SignUpError).code).toBe("unavailable");
  });

  it("rethrows anything that is not a unique violation", async () => {
    const repo = createDrizzleSignUpRepository(
      stubDb(async () => {
        throw neonError("connection terminated unexpectedly", "08006");
      }),
    );

    const error = await caught(() => repo.createMember(input));

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(SignUpError);
    expect((error as Error).message).toBe("connection terminated unexpectedly");
  });
});
