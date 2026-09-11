import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../db/password";
import {
  ChangePasswordError,
  changePassword,
  createMemoryChangePasswordRepository,
  type ChangePasswordRepository,
} from "./change-password";

const CURRENT = "correct-horse-battery";
const NEXT = "staple-battery-correct";
const USER_ID = "user-1";

async function errorOf(
  run: () => Promise<unknown>,
): Promise<ChangePasswordError> {
  try {
    await run();
  } catch (error) {
    if (error instanceof ChangePasswordError) {
      return error;
    }
    throw error;
  }
  throw new Error("expected changePassword to throw");
}

async function codeOf(run: () => Promise<unknown>): Promise<string> {
  return (await errorOf(run)).code;
}

/** A repo pre-seeded with a real bcrypt hash of `CURRENT`. */
async function seededRepo(password = CURRENT) {
  return createMemoryChangePasswordRepository([
    { id: USER_ID, passwordHash: await hashPassword(password) },
  ]);
}

describe("changePassword", () => {
  it("replaces the hash so the new password verifies and the old one does not", async () => {
    const repo = await seededRepo();
    const before = repo.users[0].passwordHash;

    await changePassword(USER_ID, { current: CURRENT, next: NEXT }, { repo });

    const after = repo.users[0].passwordHash;
    expect(after).not.toBe(before);
    // Never the plaintext, and a real bcrypt digest.
    expect(after).not.toBe(NEXT);
    expect(after.startsWith("$2b$")).toBe(true);

    expect(await verifyPassword(NEXT, after)).toBe(true);
    expect(await verifyPassword(CURRENT, after)).toBe(false);
  });

  it("hashes the new password, never the current one", async () => {
    const hashed: string[] = [];
    const repo = createMemoryChangePasswordRepository([
      { id: USER_ID, passwordHash: "$2b$10$stored" },
    ]);

    await changePassword(
      USER_ID,
      { current: CURRENT, next: NEXT },
      {
        repo,
        verify: async () => true,
        hash: async (plaintext) => {
          hashed.push(plaintext);
          return "$2b$10$rewritten";
        },
      },
    );

    expect(hashed).toEqual([NEXT]);
    expect(repo.users[0].passwordHash).toBe("$2b$10$rewritten");
  });

  it("looks the user up by id, so the caller cannot pass an email or a tenant", async () => {
    const lookedUp: string[] = [];
    const repo = createMemoryChangePasswordRepository([
      { id: USER_ID, passwordHash: "$2b$10$stored" },
    ]);
    const recording: ChangePasswordRepository = {
      async findById(userId) {
        lookedUp.push(userId);
        return repo.findById(userId);
      },
      updatePasswordHash: (userId, passwordHash) =>
        repo.updatePasswordHash(userId, passwordHash),
    };

    await changePassword(
      USER_ID,
      { current: CURRENT, next: NEXT },
      { repo: recording, verify: async () => true, hash: async () => "h" },
    );

    expect(lookedUp).toEqual([USER_ID]);
  });

  it("rejects a wrong current password and leaves the hash untouched", async () => {
    const repo = await seededRepo();
    const before = repo.users[0].passwordHash;

    expect(
      await codeOf(() =>
        changePassword(
          USER_ID,
          { current: "not-the-password", next: NEXT },
          { repo },
        ),
      ),
    ).toBe("wrong_current");

    expect(repo.users[0].passwordHash).toBe(before);
  });

  it("answers a missing user exactly like a wrong password", async () => {
    const repo = createMemoryChangePasswordRepository([]);

    expect(
      await codeOf(() =>
        changePassword("ghost", { current: CURRENT, next: NEXT }, { repo }),
      ),
    ).toBe("wrong_current");
    expect(repo.users).toHaveLength(0);
  });

  it("checks the current password before the shape of the new one", async () => {
    // A weak `next` alongside a bad `current` must not tell the caller their
    // identity check failed by reporting the password policy instead.
    const repo = await seededRepo();

    expect(
      await codeOf(() =>
        changePassword(USER_ID, { current: "wrong", next: "short" }, { repo }),
      ),
    ).toBe("wrong_current");
  });

  it("rejects a new password shorter than 12 characters", async () => {
    const repo = await seededRepo();
    const before = repo.users[0].passwordHash;

    expect(
      await codeOf(() =>
        changePassword(
          USER_ID,
          { current: CURRENT, next: "elevenchars" },
          {
            repo,
          },
        ),
      ),
    ).toBe("weak_password");

    expect(repo.users[0].passwordHash).toBe(before);
  });

  it("counts the floor in code points after the current password is proved", async () => {
    const repo = await seededRepo();
    const before = repo.users[0].passwordHash;

    // Twelve UTF-16 units, six visible characters: this passed before 8.2.
    expect("\u{1F600}".repeat(6)).toHaveLength(12);
    expect(
      await codeOf(() =>
        changePassword(
          USER_ID,
          { current: CURRENT, next: "\u{1F600}".repeat(6) },
          { repo },
        ),
      ),
    ).toBe("weak_password");
    expect(repo.users[0].passwordHash).toBe(before);

    await changePassword(
      USER_ID,
      { current: CURRENT, next: "\u{1F600}".repeat(12) },
      { repo },
    );
    expect(
      await verifyPassword("\u{1F600}".repeat(12), repo.users[0].passwordHash),
    ).toBe(true);
  });

  it("rejects a new password over the 72-byte bcrypt limit", async () => {
    const repo = await seededRepo();
    const before = repo.users[0].passwordHash;

    expect(
      await codeOf(() =>
        changePassword(
          USER_ID,
          { current: CURRENT, next: "a".repeat(73) },
          {
            repo,
          },
        ),
      ),
    ).toBe("password_too_long");

    // 40 two-byte characters are 40 characters but 80 bytes.
    expect(
      await codeOf(() =>
        changePassword(
          USER_ID,
          { current: CURRENT, next: "é".repeat(40) },
          {
            repo,
          },
        ),
      ),
    ).toBe("password_too_long");

    expect(repo.users[0].passwordHash).toBe(before);
  });

  it("accepts the exact boundaries of the password rule", async () => {
    // 12 characters and 72 bytes are both allowed: the rule is a floor and a
    // ceiling, not a pair of strict inequalities.
    const repo = await seededRepo();
    const accept = {
      repo,
      verify: async () => true,
      hash: async (plaintext: string) => `hashed:${plaintext.length}`,
    };

    await changePassword(
      USER_ID,
      { current: CURRENT, next: "a".repeat(12) },
      accept,
    );
    expect(repo.users[0].passwordHash).toBe("hashed:12");

    // 36 two-byte characters is exactly 72 bytes.
    await changePassword(
      USER_ID,
      { current: CURRENT, next: "é".repeat(36) },
      accept,
    );
    expect(repo.users[0].passwordHash).toBe("hashed:36");
  });

  it("rejects a new password identical to the current one", async () => {
    const repo = await seededRepo();
    const before = repo.users[0].passwordHash;

    expect(
      await codeOf(() =>
        changePassword(USER_ID, { current: CURRENT, next: CURRENT }, { repo }),
      ),
    ).toBe("unchanged");

    expect(repo.users[0].passwordHash).toBe(before);
  });

  it("fails closed when the row is gone by the time it writes", async () => {
    // A 0-row update must not report success: the form would show "Password
    // updated" for a password that never landed.
    const repo: ChangePasswordRepository = {
      async findById() {
        return { id: USER_ID, passwordHash: "$2b$10$stored" };
      },
      async updatePasswordHash() {
        return false;
      },
    };

    expect(
      await codeOf(() =>
        changePassword(
          USER_ID,
          { current: CURRENT, next: NEXT },
          { repo, verify: async () => true, hash: async () => "h" },
        ),
      ),
    ).toBe("unavailable");
  });

  it("treats a non-string field as empty rather than throwing", async () => {
    const repo = await seededRepo();

    expect(
      await codeOf(() =>
        changePassword(USER_ID, { current: null, next: undefined }, { repo }),
      ),
    ).toBe("wrong_current");
  });
});
