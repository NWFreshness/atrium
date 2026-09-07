import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDemoResetters,
  registerDemoResetter,
  resetDemo,
} from "./reset-demo";

const ownerSession = {
  user: {
    id: "user-owner",
    tenantId: "tenant-owner",
    role: "owner" as const,
  },
};

const demoSession = {
  user: {
    id: "user-demo",
    tenantId: "tenant-demo",
    role: "demo" as const,
  },
};

describe("resetDemo", () => {
  beforeEach(() => {
    clearDemoResetters();
  });

  it("throws when the session role is owner and does not run resetters", async () => {
    let called = false;
    registerDemoResetter(async () => {
      called = true;
    });

    await expect(resetDemo(async () => ownerSession)).rejects.toThrow();
    expect(called).toBe(false);
  });

  it("succeeds for a demo session with an empty registry", async () => {
    await expect(resetDemo(async () => demoSession)).resolves.toBeUndefined();
  });

  it("uses session tenantId and ignores a client-supplied tenantId", async () => {
    const seen: string[] = [];
    registerDemoResetter(async (_tx, tenantId) => {
      seen.push(tenantId);
    });

    await resetDemo(async () => demoSession, {
      tenantId: "attacker-tenant",
    });

    expect(seen).toEqual(["tenant-demo"]);
  });

  it("rolls back when a resetter writes then throws", async () => {
    const committed = new Map<string, string>();

    async function runInTransaction(
      work: (tx: Map<string, string>) => Promise<void>,
    ): Promise<void> {
      const tx = new Map(committed);
      try {
        await work(tx);
        committed.clear();
        for (const [key, value] of tx) {
          committed.set(key, value);
        }
      } catch (error) {
        throw error;
      }
    }

    registerDemoResetter(async (tx) => {
      (tx as Map<string, string>).set("row", "wiped");
      throw new Error("resetter failed");
    });

    await expect(
      resetDemo(async () => demoSession, { runInTransaction }),
    ).rejects.toThrow("resetter failed");

    expect(committed.size).toBe(0);
  });
});
