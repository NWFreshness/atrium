/**
 * Phase 6.4 — the Accounts smoke.
 *
 * Everything here is something a unit test cannot see: signup and change-password
 * write through the real Drizzle repositories (the unit tests inject a memory repo),
 * the routes run through the real middleware gate, and `AUTH_SIGNUP_ENABLED` decides
 * what a stranger actually sees rendered.
 *
 * One Next process cannot flip that flag mid-suite, so the open-signup journeys skip
 * unless the flag is `"true"` in the runner's environment — Playwright passes its own
 * env to the dev server it starts:
 *
 *   AUTH_SIGNUP_ENABLED=true npx playwright test e2e/accounts.spec.ts
 *
 * With the flag off, the closed state is asserted instead. The two halves never run
 * together, which is why each of them carries its own `test.skip`.
 *
 * Each journey signs up its own member with a fresh address so a retry cannot land on
 * a password the previous attempt already rotated. The members are left in place (they
 * own empty tenants); 6.4's spec says not to delete them.
 */
import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;
const signupEnabled = process.env.AUTH_SIGNUP_ENABLED === "true";

// One address per journey, unique per run.
const run = Date.now();
const signupMember = {
  email: `e2e.accounts.${run}.signup@atrium.local`,
  password: "atrium-e2e-accounts-signup",
};
const rotateMember = {
  email: `e2e.accounts.${run}.rotate@atrium.local`,
  password: "atrium-e2e-accounts-rotate",
  next: "atrium-e2e-accounts-rotated",
};

/** Every member address here must satisfy 6.1's 12-character rule. */
for (const member of [signupMember, rotateMember]) {
  if (member.password.length < 12) {
    throw new Error(`${member.email}: e2e password is under 12 characters`);
  }
}

/** The loaded dev DB makes navigations slow; the 5 s default times them out. */
const NAV = { timeout: 20_000 };
/** A server action adds bcrypt plus a Neon round trip, so its copy needs NAV too. */
const TEXT = { timeout: 20_000 };
/** A journey is several navigations plus two bcrypt round trips, past the 30 s cap. */
const JOURNEY = 120_000;

/** The demo tenant's seed, the same three names `e2e/crm.spec.ts` asserts on. */
const DEMO_SEED_ORGS = [
  "Northwind Logistics",
  "Bluepeak Software",
  "Harbor & Lane",
] as const;

test.beforeAll(() => {
  if (!ownerEmail || !ownerPassword) {
    throw new Error(
      "AUTH_OWNER_EMAIL and AUTH_OWNER_PASSWORD are required for e2e",
    );
  }
});

/** `exact` throughout: "Password" is a substring of "Confirm password". */
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", NAV);
}

async function signUp(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL("/signup", NAV);

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/", NAV);
}

/**
 * Fill the three fields and submit.
 *
 * React 19 clears the form when an action completes, and that reset can land *after*
 * a `fill`. The inputs are `required`, so a wiped field makes the browser block the
 * submit with no request at all: the click reads as a no-op and the previous banner
 * stays on screen, which is exactly how this helper first hid a real failure. Wait
 * for the reset, then prove each value stuck before clicking.
 */
async function changePassword(page: Page, current: string, next: string) {
  const field = (label: string) => page.getByLabel(label, { exact: true });
  const entries = [
    ["Current password", current],
    ["New password", next],
    ["Confirm new password", next],
  ] as const;

  for (const [label] of entries) {
    await expect(field(label)).toHaveValue("", TEXT);
  }
  for (const [label, value] of entries) {
    await field(label).fill(value);
  }
  for (const [label, value] of entries) {
    await expect(field(label)).toHaveValue(value, TEXT);
  }

  await page.getByRole("button", { name: "Update password" }).click();
}

test("unauthenticated /settings and / both redirect to login", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("member signup lands on the launcher with no Reset demo and no demo data", async ({
  page,
}) => {
  test.skip(!signupEnabled, "needs AUTH_SIGNUP_ENABLED=true");
  test.setTimeout(JOURNEY);

  await signUp(page, signupMember.email, signupMember.password);

  await expect(page.getByRole("heading", { name: "Atrium" })).toBeVisible();
  // The chip's accessible name is the address we typed, so this is also the proof
  // that the session belongs to the member we just created.
  await expect(
    page.getByRole("link", { name: signupMember.email, exact: true }),
  ).toBeVisible();

  // A member has no seeded tenant and no reset path.
  await expect(page.getByRole("button", { name: "Reset demo" })).toHaveCount(0);

  // Spot-check the CRM: the demo tenant's seed must not leak into a member's.
  // Assert on the organizations list rather than the dashboard — the dashboard only
  // names an org through its open-deals chart, so it would stay green on a leak that
  // never reached that one series.
  await page.goto("/crm/organizations");
  await expect(
    page.getByRole("heading", { name: "Organizations", level: 1 }),
  ).toBeVisible();
  for (const name of DEMO_SEED_ORGS) {
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  }
});

test("member changes their password, and only the new one signs in", async ({
  page,
}) => {
  test.skip(!signupEnabled, "needs AUTH_SIGNUP_ENABLED=true");
  test.setTimeout(JOURNEY);

  await signUp(page, rotateMember.email, rotateMember.password);

  // Into /settings through the identity chip.
  await page
    .getByRole("link", { name: rotateMember.email, exact: true })
    .click();
  await expect(page).toHaveURL("/settings", NAV);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  // Nothing but app copy on this page: a `//` line among JSX children renders as a
  // visible text node rather than a comment. 6.3 shipped one above the success
  // banner and no test noticed until this journey walked the page.
  await expect(page.getByText("//")).toHaveCount(0);

  // A wrong current password reports the generic copy and changes nothing.
  await changePassword(page, "definitely-not-the-password", rotateMember.next);
  await expect(page.getByText("Could not update password.")).toBeVisible(TEXT);

  // The real change reports success without leaving the page — and without signing
  // this session out, which is spec §4's decision.
  await changePassword(page, rotateMember.password, rotateMember.next);
  await expect(page.getByText("Password updated.")).toBeVisible(TEXT);
  await expect(page).toHaveURL("/settings", NAV);
  await expect(
    page.getByRole("link", { name: rotateMember.email, exact: true }),
  ).toBeVisible();

  // Repeating the current password is its own rejection, not a second success.
  await changePassword(page, rotateMember.next, rotateMember.next);
  await expect(
    page.getByText("Choose a password different from your current one."),
  ).toBeVisible(TEXT);

  // The old password is dead.
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/, NAV);
  await page.getByLabel("Email", { exact: true }).fill(rotateMember.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(rotateMember.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible(TEXT);

  // The new one works. React 19 cleared the field; the email is echoed back.
  await page.getByLabel("Password", { exact: true }).fill(rotateMember.next);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", NAV);
  await expect(
    page.getByRole("link", { name: rotateMember.email, exact: true }),
  ).toBeVisible();
});

test("owner login still reaches home, with no Reset demo", async ({ page }) => {
  await login(page, ownerEmail!, ownerPassword!);
  await expect(page.getByRole("heading", { name: "Atrium" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset demo" })).toHaveCount(0);
});

test("demo login still reaches home and still sees Reset demo", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );

  await login(page, demoEmail!, demoPassword!);
  await expect(page.getByRole("heading", { name: "Atrium" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset demo" })).toBeVisible();
});

test("signups are closed to a visitor when the flag is not true", async ({
  page,
}) => {
  test.skip(signupEnabled, "the runner has AUTH_SIGNUP_ENABLED=true");

  // /login does not advertise a door that is shut.
  await page.goto("/login");
  await expect(
    page.getByRole("link", { name: "Create an account" }),
  ).toHaveCount(0);
  await expect(page.getByText("Signups closed")).toBeVisible();

  // /signup still answers, but with no form to post.
  await page.goto("/signup");
  await expect(
    page.getByRole("heading", { name: "Signups closed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
});
