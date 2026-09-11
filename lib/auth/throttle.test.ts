import { describe, expect, it } from "vitest";
import { createMemoryThrottleStore } from "./throttle-memory";
import {
  EMAIL_FAILURE_LIMIT,
  IP_FAILURE_LIMIT,
  WINDOW_MS,
  assertNotThrottled,
  clearFailures,
  emailSubject,
  ipSubject,
  recordFailure,
  requestIp,
} from "./throttle";

describe("throttle policy", () => {
  it("blocks the sixth email failure inside the window and allows after it", async () => {
    const store = createMemoryThrottleStore();
    let now = new Date("2026-09-11T12:00:00.000Z");
    const clock = () => now;
    const attempt = { email: "Tyler@Example.com" };

    expect(emailSubject(attempt.email)).toBe("email:tyler@example.com");

    for (let i = 0; i < EMAIL_FAILURE_LIMIT; i += 1) {
      expect(await assertNotThrottled(store, attempt, clock)).toEqual({
        ok: true,
      });
      await recordFailure(store, attempt, clock);
    }

    expect(await assertNotThrottled(store, attempt, clock)).toEqual({
      ok: false,
    });

    now = new Date(now.getTime() + WINDOW_MS);
    expect(await assertNotThrottled(store, attempt, clock)).toEqual({
      ok: true,
    });
  });

  it("blocks the twenty-first failure for one IP; another IP is unaffected", async () => {
    const store = createMemoryThrottleStore();
    const now = new Date("2026-09-11T12:00:00.000Z");
    const clock = () => now;
    const ip = "203.0.113.9";

    expect(ipSubject(ip)).toBe("ip:203.0.113.9");

    for (let i = 0; i < IP_FAILURE_LIMIT; i += 1) {
      const attempt = { email: `user${i}@atrium.local`, ip };
      expect(await assertNotThrottled(store, attempt, clock)).toEqual({
        ok: true,
      });
      await recordFailure(store, attempt, clock);
    }

    expect(
      await assertNotThrottled(
        store,
        { email: "other@atrium.local", ip },
        clock,
      ),
    ).toEqual({ ok: false });

    expect(
      await assertNotThrottled(
        store,
        { email: "other@atrium.local", ip: "198.51.100.2" },
        clock,
      ),
    ).toEqual({ ok: true });
  });

  it("lets the next attempt through after clearFailures", async () => {
    const store = createMemoryThrottleStore();
    const now = new Date("2026-09-11T12:00:00.000Z");
    const clock = () => now;
    const attempt = { email: "member@atrium.local", ip: "203.0.113.9" };

    for (let i = 0; i < EMAIL_FAILURE_LIMIT; i += 1) {
      await recordFailure(store, attempt, clock);
    }
    expect(await assertNotThrottled(store, attempt, clock)).toEqual({
      ok: false,
    });

    await clearFailures(store, attempt);
    expect(await assertNotThrottled(store, attempt, clock)).toEqual({
      ok: true,
    });
  });

  it("reads the first x-forwarded-for hop", () => {
    const request = new Request("https://atrium.example/login", {
      headers: { "x-forwarded-for": " 203.0.113.9, 10.0.0.1 " },
    });
    expect(requestIp(request)).toBe("203.0.113.9");
    expect(
      requestIp(new Request("https://atrium.example/login")),
    ).toBeUndefined();
  });
});
