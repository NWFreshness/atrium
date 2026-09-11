/**
 * Source-grep checks for the login page.
 *
 * The email/error contract matters more than it looks: `/login` is the only way
 * back in for a member (there is no password reset), so a failed attempt must
 * not clear the address, and the error copy is asserted by `e2e/login.spec.ts`.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");

const loginPage = read("app/login/page.tsx");
const loginForm = read("app/login/login-form.tsx");
const loginAction = read("app/login/actions.ts");

describe("login form", () => {
  it("keeps the Email/Password labels and the Sign in button the e2e relies on", () => {
    expect(loginForm).toContain("<span>Email</span>");
    expect(loginForm).toContain("<span>Password</span>");
    expect(loginForm).toContain("Sign in");
    expect(loginForm).toContain('autoComplete="username"');
    expect(loginForm).toContain('autoComplete="current-password"');
  });

  it("restores the typed email after a failed attempt", () => {
    // React 19 clears uncontrolled fields when a form action completes; without
    // this the member retypes their address on every fumble.
    expect(loginForm).toContain("defaultValue={state.email}");
    expect(loginForm).toContain("useActionState(login, INITIAL)");
  });

  it("uses the shared Workroom field/button/alert classes", () => {
    expect(loginForm).toContain("atrium-field");
    expect(loginForm).toContain("atrium-btn-primary");
    expect(loginForm).toContain('styles["auth-alert"]');
    expect(loginForm).toContain('styles["auth-submit"]');
  });
});

describe("login action", () => {
  it("returns the email alongside the error so the form can echo it", () => {
    expect(loginAction).toContain("error: null, email");
    expect(loginAction).toContain("return { error:");
    expect(loginAction).toContain("email };");
  });

  it("keeps the generic copy the login e2e asserts", () => {
    expect(loginAction).toContain('"Invalid email or password"');
    expect(loginAction).not.toContain("No account");
    expect(loginAction).not.toContain("Unknown email");
  });

  it("rethrows the redirect signIn uses to signal success", () => {
    expect(loginAction).toContain("if (error instanceof AuthError)");
    expect(loginAction).toContain("throw error");
  });
});

describe("login page", () => {
  it("reads the signup flag per request", () => {
    expect(loginPage).toContain('export const dynamic = "force-dynamic"');
    expect(loginPage).toContain("isSignupEnabled(process.env)");
  });

  it("hides the signup route when the flag is off", () => {
    expect(loginPage).toMatch(/signupOpen\s*\?/);
    expect(loginPage).toContain(
      '<Link href="/signup">Create an account</Link>',
    );
    expect(loginPage).toContain("<span>Signups closed</span>");
  });
});
