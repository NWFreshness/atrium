/**
 * Source-grep checks for the Phase 6.2 auth pages.
 *
 * These lock the two things that are invisible to `npm test` otherwise: that the
 * signup flag is read per request (a prerendered page would bake the build-time
 * value), and that the closed state has no form to submit.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");

const signupPage = read("app/signup/page.tsx");
const signupForm = read("app/signup/signup-form.tsx");
const signupAction = read("app/signup/actions.ts");
const loginPage = read("app/login/page.tsx");
const loginForm = read("app/login/login-form.tsx");
const authStage = read("app/auth-stage.module.css");

describe("signup flag is resolved per request", () => {
  it("forces both auth pages dynamic", () => {
    for (const [name, source] of [
      ["app/signup/page.tsx", signupPage],
      ["app/login/page.tsx", loginPage],
    ] as const) {
      expect(source, `${name} would prerender the flag`).toContain(
        'export const dynamic = "force-dynamic"',
      );
    }
  });

  it("reads the flag from the environment rather than a module constant", () => {
    expect(signupPage).toContain("isSignupEnabled(process.env)");
    expect(loginPage).toContain("isSignupEnabled(process.env)");
    expect(signupAction).toContain("isSignupEnabled(process.env)");
  });
});

describe("signup form", () => {
  it("asks for email, password, and confirmation with accessible labels", () => {
    for (const label of ["Email", "Password", "Confirm password"]) {
      expect(signupForm).toContain(`<span>${label}</span>`);
    }
    for (const field of ["email", "password", "confirmPassword"]) {
      expect(signupForm).toContain(`name="${field}"`);
    }
    expect(signupForm).toContain("Create account");
  });

  it("uses the shared Workroom field and button classes", () => {
    expect(signupForm).toContain("atrium-field");
    expect(signupForm).toContain("atrium-btn-primary");
  });

  it("renders the form only when the page says signups are open", () => {
    expect(signupPage).toContain("<SignUpForm />");
    // The closed branch must not offer a submit path.
    const closedBranch = signupPage.slice(signupPage.indexOf(") : ("));
    expect(closedBranch).toContain("auth-note");
    expect(closedBranch).not.toContain("<SignUpForm />");
  });
});

describe("the login page advertises signup only when it is open", () => {
  it("links to /signup from the footer", () => {
    expect(loginPage).toContain('href="/signup"');
    expect(loginPage).toContain("Create an account");
  });

  it("drops the retired no-signup copy", () => {
    expect(loginPage).not.toContain("no signup");
    expect(loginPage).not.toContain("Two accounts");
  });
});

describe("one shared stage for both auth pages", () => {
  it("keeps the login stylesheet from coming back as a second copy", () => {
    expect(() => read("app/login/login.module.css")).toThrow();
  });

  it("imports the shared module bound so the hashed names resolve", () => {
    expect(loginPage).toContain(
      'import styles from "../auth-stage.module.css"',
    );
    expect(signupPage).toContain(
      'import styles from "../auth-stage.module.css"',
    );
    expect(loginForm).toContain(
      'import styles from "../auth-stage.module.css"',
    );
  });

  it("defines the stage classes the pages reference", () => {
    for (const cls of [
      "auth-stage",
      "auth-mark",
      "auth-card",
      "auth-brandrow",
      "auth-tag",
      "auth-note",
      "auth-submit",
      "auth-alert",
      "auth-foot",
    ]) {
      expect(authStage, `missing .${cls}`).toContain(`.${cls}`);
    }
  });
});
