/**
 * Phase 11.2 — the CRM deals surface in a browser.
 *
 * Two journeys, and both rely on a contract 11.2 just put in the barrel:
 * `createDeal` and `updateDeal` reject a negative value, a probability over
 * 100, and a non-integer probability (`lib/input/numbers.ts`). The client
 * form still does not reject these on its own (the silent `isFinite` check
 * at `components/crm/deal-form.tsx:89-93` is left in place — 9.6 says the
 * server is the gate), so driving a 500 from the dialog is not this
 * feature's UX contract. A legal value (`1000`) and the `New → 10` default
 * succeed, and that is what these journeys assert.
 *
 * 11.4 appends sorting assertions; 11.5 appends edit-from-detail journeys.
 * Neither is this file's job.
 */
import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;

/**
 * Throws without the owner pair even though every test here is demo-only and
 * never reads the owner credentials. That is deliberate and is the same
 * shape as the rest of the CRM e2e suite: the whole surface is gated on the
 * six-secret contract in `.github/workflows/ci.yml`, and a demo-only file
 * that ran without the owner pair would report green in a half-configured
 * environment where the deals surface was only half exercised.
 */
test.beforeAll(() => {
  if (!ownerEmail || !ownerPassword) {
    throw new Error(
      "AUTH_OWNER_EMAIL and AUTH_OWNER_PASSWORD are required for e2e",
    );
  }
});

/**
 * Copied verbatim from `e2e/crm.spec.ts:22-28`, including the `toHaveURL` —
 * `waitForURL` does not survive the credentials round trip
 * (`/api/auth/callback/credentials` sits between the click and the landing),
 * while `toHaveURL` retries and passes.
 */
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

function crmNav(page: Page) {
  return page.getByRole("navigation", { name: "CRM" });
}

/**
 * A dev-server action against a loaded database takes seconds on a cold
 * route, so the 5 s default per-assertion timeout times these journeys
 * out. Mirrors `e2e/workroom.spec.ts:211` and is applied to every
 * assertion that follows a navigation or a server action.
 */
const NAV_TIMEOUT = { timeout: 20_000 };

/**
 * The 30 s Playwright default is the **whole test's** budget, not one
 * assertion's. Journey F (create + reload) is a 60 s walk; Journey G
 * (create org + create deal + delete org + reload) is a 120 s walk because
 * it visits four screens.
 */
const F_TIMEOUT = 60_000;
const G_TIMEOUT = 120_000;

/**
 * The name the *currently running* test minted, so `afterEach` can delete
 * it. A cleanup target, not a fixture: it holds no tenant state and is
 * cleared by the very cleanup that reads it.
 *
 * Every minted name carries `crypto.randomUUID()` and not just
 * `Date.now()`: cleanup deletes **by name**, so a collision would have one
 * run's `afterEach` delete another run's row — and the loser's closing
 * `toHaveCount(0)` would then pass while asserting nothing about its own
 * deal. `Date.now()` alone is only unique within a process; two concurrent
 * runs, or a run and a developer's own suite, reach the same millisecond
 * easily.
 */
let minted: string | null = null;
let mintedOrg: string | null = null;

/**
 * A function, not a Playwright fixture: takes a `name` argument and returns
 * nothing. The same shape as `e2e/crm-pipeline.spec.ts:136-151`, copied so
 * the three CRM spec files share one implementation but each owns its
 * private copy (re-importing a `.spec.ts` re-registers its tests, which
 * would double-run them).
 */
async function createDeal(page: Page, name: string, organizationId?: string) {
  await page.goto("/crm/deals");
  await expect(
    page.getByRole("heading", { name: "Deals", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await page.getByRole("button", { name: "Add deal", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add deal" });
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByLabel("Value", { exact: true }).fill("1000");
  if (organizationId) {
    await dialog
      .getByLabel("Organization", { exact: true })
      .selectOption(organizationId);
  }
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible(
    NAV_TIMEOUT,
  );
}

/**
 * Cleanup is best-effort but **verified**: the loop re-reads the button
 * list on every pass, because a loop that only ever looks at `.first()`
 * deletes one row and silently leaves the rest. If the row survives, the
 * final assertion throws and the test is red — a test must not report
 * green over a leak.
 */
async function deleteMintedDeal(page: Page, name: string) {
  // A prior test body may have registered a `page.on("dialog", …)`
  // handler (Journey G does, for its org-delete confirm). `page.on` is
  // additive — every call adds another listener — so two listeners on
  // the same dialog races: one accepts, the other throws "Cannot accept
  // dialog which is already handled", and the test errors. Clearing
  // first keeps the listener count at one for this cleanup.
  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/crm/deals");
  for (let pass = 0; pass < 5; pass += 1) {
    const remove = page.getByRole("button", {
      name: `Delete ${name}`,
      exact: true,
    });
    if ((await remove.count()) === 0) {
      break;
    }
    await remove.first().click();
    await expect(remove).toHaveCount(0, NAV_TIMEOUT);
  }
  await expect(page.getByRole("link", { name, exact: true })).toHaveCount(
    0,
    NAV_TIMEOUT,
  );
}

/**
 * Mirrors the org create in `e2e/crm.spec.ts:81-87`, adapted to return
 * nothing and to capture the org name in `mintedOrg` so the deal that
 * references it can be deleted first (the deal's row will block the org
 * delete otherwise — `deleteOrganization` does not cascade; it sets
 * related rows' `organizationId` to null, but a deal *row* still owns its
 * `organizationId` cell until the deal is deleted). `afterEach` cleans
 * the deal first, then the org.
 */
async function createOrganization(page: Page, name: string) {
  await page.goto("/crm/organizations");
  await expect(
    page.getByRole("heading", { name: "Organizations", level: 1 }),
  ).toBeVisible(NAV_TIMEOUT);
  await page.getByRole("button", { name: "Add organization" }).click();
  const dialog = page.getByRole("dialog", { name: "Add organization" });
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await expect(page.getByRole("link", { name })).toBeVisible(NAV_TIMEOUT);
}

test.afterEach(async ({ page }) => {
  const dealName = minted;
  const orgName = mintedOrg;
  minted = null;
  mintedOrg = null;
  // The deal must be deleted before the org: SET NULL leaves the deal's
  // `organizationId` cell as `null` after the org is gone, but the org
  // delete still runs through the org's `Delete {name}` button and
  // unlinking a deal from its org is a separate user action. Easier and
  // cheaper to just clean the deal first.
  if (dealName) {
    await deleteMintedDeal(page, dealName);
  }
  if (orgName) {
    page.removeAllListeners("dialog");
    page.on("dialog", (dialog) => void dialog.accept());
    await page.goto("/crm/organizations");
    const remove = page.getByRole("button", {
      name: `Delete ${orgName}`,
      exact: true,
    });
    if ((await remove.count()) > 0) {
      await remove.first().click();
      await expect(remove).toHaveCount(0, NAV_TIMEOUT);
    }
    await expect(page.getByRole("link", { name: orgName, exact: true })).toHaveCount(
      0,
      NAV_TIMEOUT,
    );
  }
});

test("a created deal appears on the deals table and the pipeline board, and can be deleted", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(F_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  const name = `E2E Deal ${Date.now()} ${crypto.randomUUID()}`;
  minted = name;
  await createDeal(page, name);

  // Appears on the pipeline board under the default `New` stage
  // (`components/crm/deal-form.tsx:53`). A new deal defaults to `New`, so
  // the card should render in that column.
  await crmNav(page).getByRole("link", { name: "Pipeline" }).click();
  await expect(
    page.getByRole("heading", { name: "Pipeline", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  const card = page
    .locator("article")
    .filter({ has: page.getByText(name, { exact: true }) });
  await expect(card).toBeVisible(NAV_TIMEOUT);
  // Default probability for `New` is 10 (`lib/crm/constants.ts:12-19`).
  // Read after a reload so the value is the server's, not the optimistic
  // rebase from `onDragEnd` — the same `expectedValue` / `formatMoney`
  // composition runs on both sides but the post-reload number is the
  // round-trip proof.
  await expect(card).toContainText("10%", { timeout: NAV_TIMEOUT.timeout });

  // Delete it from the deals table. `confirm()` is at
  // `components/crm/deal-table.tsx:117`; the aria-label is at `:114`.
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/crm/deals");
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible(NAV_TIMEOUT);
  const remove = page.getByRole("button", {
    name: `Delete ${name}`,
    exact: true,
  });
  await remove.click();
  await expect(remove).toHaveCount(0, NAV_TIMEOUT);

  // Gone from the table after reload.
  await page.reload();
  await expect(page.getByRole("link", { name, exact: true })).toHaveCount(
    0,
    NAV_TIMEOUT,
  );

  // Gone from the board after reload.
  await page.goto("/crm/pipeline");
  await expect(
    page.getByRole("heading", { name: "Pipeline", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await expect(card).toHaveCount(0, NAV_TIMEOUT);
});

test("deleting an organization sets the deal's organization cell to null without deleting the deal", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(G_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  // Two unique names: an org and a deal, both written by this test, both
  // deleted in `afterEach`. The deal holds the org's id; deleting the org
  // triggers the `SET NULL` cascade on `deals.organizationId`
  // (`lib/crm/schema.ts:72-77`).
  const orgName = `E2E Org For Deal ${Date.now()} ${crypto.randomUUID()}`;
  const dealName = `E2E Deal With Org ${Date.now()} ${crypto.randomUUID()}`;
  mintedOrg = orgName;
  minted = dealName;

  await createOrganization(page, orgName);
  // Read the org id off the row's link href, then create a deal that
  // references it. The deal-form's `Organization` select is keyed by id
  // (`components/crm/deal-form.tsx:228-232`), so the option's value is
  // the id, not the name.
  const orgLink = page.getByRole("link", { name: orgName, exact: true });
  const orgHref = await orgLink.getAttribute("href");
  if (!orgHref) {
    throw new Error("crm-deals: organization link has no href");
  }
  const orgId = orgHref.split("/").pop() ?? "";
  if (!orgId) {
    throw new Error("crm-deals: organization id missing from href");
  }
  await createDeal(page, dealName, orgId);

  // The deal's row carries the org name in its Organization cell.
  await page.goto("/crm/deals");
  const dealRow = page.getByRole("row").filter({ hasText: dealName });
  await expect(dealRow).toBeVisible(NAV_TIMEOUT);
  await expect(dealRow).toContainText(orgName, { timeout: NAV_TIMEOUT.timeout });

  // Delete the org. After the row's `Delete {orgName}` click, the deal
  // row should still exist and its Organization cell should no longer
  // contain the org name. Asserted as a class-free absence: the cell
  // renders `""` when `organizationId` is null
  // (`components/crm/deal-table.tsx:82-85`), so the honest claim is "the
  // org name is no longer in this row" — `.not.toContainText(orgName)`.
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/crm/organizations");
  const orgRemove = page.getByRole("button", {
    name: `Delete ${orgName}`,
    exact: true,
  });
  await expect(orgRemove).toBeVisible(NAV_TIMEOUT);
  await orgRemove.click();
  await expect(orgRemove).toHaveCount(0, NAV_TIMEOUT);

  await page.goto("/crm/deals");
  await expect(page.getByRole("row").filter({ hasText: dealName })).toBeVisible(
    NAV_TIMEOUT,
  );
  await expect(
    page.getByRole("row").filter({ hasText: dealName }),
  ).not.toContainText(orgName, { timeout: NAV_TIMEOUT.timeout });
});
