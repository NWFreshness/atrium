/**
 * Source-grep checks for `/settings` and the identity chip.
 *
 * This screen is a security boundary rather than a table: the user id must come
 * from the session (never the form), a wrong current password must not be
 * distinguishable from a missing user, and the change must not sign anyone out.
 * None of that is observable from a unit test — the real domain rules live in
 * `lib/auth/change-password.test.ts`, and these tests pin the wiring.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUBLIC_AUTH_PATHS } from "@/auth.config";

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");

/**
 * Comments are prose. A `not.toContain` assertion that reads them fails on a
 * comment explaining why the code does *not* do the thing.
 */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const SETTINGS = "app/(authenticated)/settings";
const page = read(`${SETTINGS}/page.tsx`);
const action = read(`${SETTINGS}/actions.ts`);
const form = read(`${SETTINGS}/change-password-form.tsx`);
const nav = read("components/atrium-nav.tsx");
const middleware = read("middleware.ts");
const messages = read("lib/auth/change-password-messages.ts");
const actionCode = code(action);

describe("settings page", () => {
  it("stays behind the authenticated gate", () => {
    // The allow/deny behaviour is asserted against the real `authorized`
    // callback in auth.config.test.ts (signed out → blocked, member → allowed).
    // What that file cannot see is the other half of the gate: /settings must be
    // neither a public path nor excluded from the middleware matcher.
    expect([...PUBLIC_AUTH_PATHS]).not.toContain("/settings");
    expect(middleware).not.toContain("settings");

    expect(page).toContain("atrium-pagetitle");
    expect(page).toContain("<h1>Settings</h1>");
  });

  it("renders the form in a shared panel", () => {
    expect(page).toContain("atrium-panel");
    expect(page).toContain("<ChangePasswordForm />");
  });

  it("does not gate the password form on a role", () => {
    // Owner, demo, and member all reach this screen.
    for (const source of [page, action, form]) {
      expect(code(source)).not.toMatch(/role\s*===/);
    }
  });
});

describe("settings action", () => {
  it("takes the user id from the session, never from the form", () => {
    expect(action).toMatch(/requireTenant\(\s*\(\)\s*=>\s*auth\(\)\s*\)/);
    expect(actionCode).not.toMatch(/formData\.get\(\s*"userId"\s*\)/);
    expect(actionCode).not.toContain("tenantId");
  });

  it("keeps the session valid after a change", () => {
    // Spec §4: no forced logout, so no signOut and no redirect away.
    expect(actionCode).not.toContain("signOut");
    expect(actionCode).not.toMatch(/\bredirect\(/);
    expect(actionCode).toContain("changed: true");
  });

  it("compares the confirmation and maps the domain codes", () => {
    expect(action).toContain("PASSWORDS_DO_NOT_MATCH");
    expect(action).toContain("instanceof ChangePasswordError");
    expect(action).toContain("changePasswordMessage(error.code)");
  });
});

describe("change password form", () => {
  it("renders three labelled password fields with the right autocomplete", () => {
    expect(form).toContain("<span>Current password</span>");
    expect(form).toContain("<span>New password</span>");
    expect(form).toContain("<span>Confirm new password</span>");
    expect(form).toContain('autoComplete="current-password"');
    expect(form).toContain('autoComplete="new-password"');
  });

  it("uses the shared Workroom field/button classes", () => {
    expect(form).toContain("atrium-field");
    expect(form).toContain("atrium-btn");
    expect(form).toContain("atrium-btn-primary");
    expect(form).toContain("atrium-alert");
  });

  it("blocks a mismatched confirmation before the round trip", () => {
    // React 19 clears uncontrolled fields when the action completes, so a
    // server-side mismatch would make the user retype all three.
    expect(form).toContain("PASSWORDS_DO_NOT_MATCH");
    expect(form).toContain("event.preventDefault()");
  });

  it("shows the success banner on the settings page", () => {
    expect(form).toContain("PASSWORD_CHANGED");
    expect(form).toContain('role="status"');
  });

  it("hides the success banner when a later submit was blocked in the browser", () => {
    // The client-side mismatch block never runs the action, so `useActionState`
    // still holds { changed: true } from the previous, successful change. Without
    // the guard the user sees "Password updated." next to "Passwords do not
    // match." — a success banner for a write that did not happen.
    expect(code(form)).toMatch(/state\.changed\s*&&\s*!mismatch/);
  });

  it("never imports the domain module into the browser bundle", () => {
    // `change-password.ts` imports Drizzle; only the pure messages module may be
    // reached from a client component.
    expect(form).toMatch(/from\s+"@\/lib\/auth\/change-password-messages"/);
    expect(form).not.toMatch(/from\s+"@\/lib\/auth\/change-password"/);

    // The messages module is the form's gateway to that graph, so it must reach
    // the domain types without a value import — otherwise dropping `type` in a
    // refactor ships Drizzle, bcryptjs, and Neon to the browser while the
    // assertions above still pass.
    const imports = messages.match(/^import .*$/gm) ?? [];
    expect(imports.length).toBeGreaterThan(0);
    for (const line of imports) {
      expect(line, `value import in change-password-messages: ${line}`).toMatch(
        /^import type /,
      );
    }
  });
});

describe("identity chip", () => {
  it("links the signed-in email to /settings", () => {
    expect(nav).toMatch(/<Link\s+href="\/settings"/);
    expect(nav).toMatch(/styles\["atrium-nav-identity"\]/);
  });

  it("leaves the five app tabs alone", () => {
    for (const label of ["Home", "CRM", "Space", "Rolodex", "Groove"]) {
      expect(nav).toContain(`label: "${label}"`);
    }
    expect(nav).not.toContain('label: "Settings"');
    // APPS is the navigation: a sixth entry is the regression this guards.
    expect(nav.match(/label: "/g)).toHaveLength(5);
  });

  it("still shows Reset demo only for the demo role", () => {
    expect(nav).toContain('role === "demo"');
  });
});
