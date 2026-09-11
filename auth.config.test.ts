/**
 * The `authorized` callback is the whole access-control surface: `middleware.ts`
 * runs it for every route the matcher does not exclude, so a path missing from
 * `PUBLIC_AUTH_PATHS` is gated and a path wrongly added is open to the world.
 * These tests call the real callback.
 */
import { describe, expect, it } from "vitest";
import { PUBLIC_AUTH_PATHS, authConfig } from "./auth.config";

type AuthorizedArgs = Parameters<typeof authConfig.callbacks.authorized>[0];

const signedOut = { user: null } as unknown as AuthorizedArgs["auth"];
const member = {
  user: { id: "user-member", tenantId: "tenant-member", role: "member" },
  expires: "2099-01-01T00:00:00.000Z",
} as unknown as AuthorizedArgs["auth"];

function request(pathname: string): AuthorizedArgs["request"] {
  return {
    nextUrl: new URL(`http://localhost${pathname}`),
  } as unknown as AuthorizedArgs["request"];
}

function authorize(pathname: string, auth: AuthorizedArgs["auth"]) {
  return authConfig.callbacks.authorized({ auth, request: request(pathname) });
}

async function allowed(pathname: string, auth: AuthorizedArgs["auth"]) {
  return (await authorize(pathname, auth)) === true;
}

async function redirectTo(pathname: string, auth: AuthorizedArgs["auth"]) {
  const result = await authorize(pathname, auth);
  if (!(result instanceof Response)) {
    return null;
  }
  return new URL(result.headers.get("location") ?? "").pathname;
}

describe("authorized", () => {
  it("serves /login and /signup to a signed-out visitor", async () => {
    expect(await allowed("/login", signedOut)).toBe(true);
    expect(await allowed("/signup", signedOut)).toBe(true);
  });

  it("keeps every other route behind a session", async () => {
    for (const path of [
      "/",
      "/crm",
      "/space",
      "/rolodex",
      "/groove",
      "/settings",
    ]) {
      expect(await allowed(path, signedOut), `${path} is public`).toBe(false);
    }
  });

  it("sends a signed-in visitor from the auth pages to the launcher", async () => {
    expect(await redirectTo("/login", member)).toBe("/");
    expect(await redirectTo("/signup", member)).toBe("/");
  });

  it("lets a signed-in member through to the gated routes", async () => {
    for (const path of ["/", "/crm", "/settings"]) {
      expect(await allowed(path, member), `${path} rejects a member`).toBe(
        true,
      );
    }
  });

  it("treats a session with no user as signed out", async () => {
    const empty = {
      expires: "2099-01-01T00:00:00.000Z",
    } as unknown as AuthorizedArgs["auth"];

    expect(await allowed("/signup", empty)).toBe(true);
    expect(await allowed("/", empty)).toBe(false);
  });

  it("lists exactly the two public auth paths", () => {
    expect([...PUBLIC_AUTH_PATHS]).toEqual(["/login", "/signup"]);
  });
});
