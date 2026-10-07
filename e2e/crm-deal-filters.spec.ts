/**
 * Phase 11.8 — deal filters in a browser.
 *
 * Three journeys over rows each test mints for itself (`Date.now()` plus
 * `crypto.randomUUID()`, the `crm-deals.spec.ts` collision contract — a
 * `Date.now()` alone is only unique within a process). Nothing relies on
 * seeded `closeDate`s, and no journey asserts an exact row count: the
 * demo tenant accumulates rows from every run, so every claim is a
 * visibility or an absence of one minted link.
 *
 * Window semantics under test: the `closeBefore` the user picks is a
 * calendar day and the day is included (the page queries an exclusive
 * bound one day later). Journey 2 pins both edges of that: the picked
 * last day is visible (skipping `closeBeforeExclusive` in the page hides
 * it), and the day after is absent (`lt` relaxed to `lte` keeps it).
 */
import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;

/**
 * Throws without the owner pair even though every test here is demo-only.
 * Copied from `e2e/crm-deals.spec.ts:31-37`: the whole surface is gated
 * on the six-secret contract, and a demo-only file that ran without the
 * owner pair would report green in a half-configured environment.
 */
test.beforeAll(() => {
  if (!ownerEmail || !ownerPassword) {
    throw new Error(
      "AUTH_OWNER_EMAIL and AUTH_OWNER_PASSWORD are required for e2e",
    );
  }
});

/**
 * Copied verbatim from `e2e/crm-deals.spec.ts:45-51`, including the
 * `toHaveURL` — `waitForURL` does not survive the credentials round trip.
 */
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

/**
 * A dev-server action against a loaded database takes seconds on a cold
 * route. Mirrors `e2e/crm-deals.spec.ts:63`.
 */
const NAV_TIMEOUT = { timeout: 20_000 };

/**
 * Each journey visits three or more screens with server round trips; the
 * 30 s Playwright default is the whole test's budget, not one assertion's.
 */
const JOURNEY_TIMEOUT = 120_000;

let mintedDeals: string[] = [];
let mintedOrg: string | null = null;

/**
 * Mirrors `createOrganization` in `e2e/crm-deals.spec.ts:162-174`: creates
 * through the list-page dialog and leaves the row's link on screen so the
 * journey can read the id off its href.
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
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible(
    NAV_TIMEOUT,
  );
}

/** Reads a list-row link's href tail: `/crm/{records}/{id}` -> `{id}`. */
async function idFromRowLink(page: Page, name: string): Promise<string> {
  const href = await page
    .getByRole("link", { name, exact: true })
    .getAttribute("href");
  const id = href?.split("/").pop() ?? "";
  if (!id) {
    throw new Error(`crm-deal-filters: row link for ${name} has no id`);
  }
  return id;
}

/**
 * Mirrors `createDeal` in `e2e/crm-deals.spec.ts:97-117`, plus an optional
 * close date through the dialog's `Close date` input (`type="date"`, so a
 * `YYYY-MM-DD` fill lands on UTC midnight — see
 * `components/crm/deal-form.tsx:47-53`). New deals default to the `New`
 * stage; journeys that need another stage filter rather than mint one.
 */
async function createDeal(
  page: Page,
  name: string,
  opts?: { organizationId?: string; closeDate?: string },
) {
  await page.goto("/crm/deals");
  await expect(
    page.getByRole("heading", { name: "Deals", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await page.getByRole("button", { name: "Add deal", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add deal" });
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByLabel("Value", { exact: true }).fill("1000");
  if (opts?.closeDate) {
    await dialog
      .getByLabel("Close date", { exact: true })
      .fill(opts.closeDate);
  }
  if (opts?.organizationId) {
    await dialog
      .getByLabel("Organization", { exact: true })
      .selectOption(opts.organizationId);
  }
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible(
    NAV_TIMEOUT,
  );
}

test.afterEach(async ({ page }) => {
  const deals = mintedDeals;
  const orgName = mintedOrg;
  mintedDeals = [];
  mintedOrg = null;
  // The deals go before the org: deleting the org first would only unlink
  // them, and the deal rows would survive to pollute later runs.
  for (const name of deals) {
    // `page.once`, registered before the click that opens the confirm —
    // `page.on` is additive and a second listener on the same dialog races
    // the first (`e2e/crm-deals.spec.ts:127-134`).
    page.removeAllListeners("dialog");
    await page.goto("/crm/deals");
    const remove = page.getByRole("button", {
      name: `Delete ${name}`,
      exact: true,
    });
    if ((await remove.count()) === 0) {
      continue;
    }
    page.once("dialog", (dialog) => void dialog.accept());
    await remove.first().click();
    await expect(remove).toHaveCount(0, NAV_TIMEOUT);
    await expect(page.getByRole("link", { name, exact: true })).toHaveCount(
      0,
      NAV_TIMEOUT,
    );
  }
  if (orgName) {
    page.removeAllListeners("dialog");
    await page.goto("/crm/organizations");
    const remove = page.getByRole("button", {
      name: `Delete ${orgName}`,
      exact: true,
    });
    if ((await remove.count()) > 0) {
      page.once("dialog", (dialog) => void dialog.accept());
      await remove.first().click();
      await expect(remove).toHaveCount(0, NAV_TIMEOUT);
    }
    await expect(
      page.getByRole("link", { name: orgName, exact: true }),
    ).toHaveCount(0, NAV_TIMEOUT);
  }
});

test("stage and organization narrow the deals table and survive a reload", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(JOURNEY_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  const orgName = `E2E Filter Org ${Date.now()} ${crypto.randomUUID()}`;
  const dealName = `E2E Filter Deal ${Date.now()} ${crypto.randomUUID()}`;
  mintedOrg = orgName;
  mintedDeals.push(dealName);
  await createOrganization(page, orgName);
  const orgId = await idFromRowLink(page, orgName);
  await createDeal(page, dealName, { organizationId: orgId });

  // Narrowing: a stage the minted deal is not in hides its link. No empty
  // state is asserted here — the demo tenant accumulates rows, so other
  // `Won` deals may legitimately remain.
  await page.goto("/crm/deals?stage=Won");
  await expect(
    page.getByRole("link", { name: dealName, exact: true }),
  ).toHaveCount(0, NAV_TIMEOUT);

  // Stage plus organization together, driven through the form so the URL
  // carries the params.
  await page.goto("/crm/deals");
  await expect(
    page.getByRole("heading", { name: "Deals", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await page.locator('form[action="/crm/deals"]').getByLabel("Stage").selectOption("New");
  await page.locator('form[action="/crm/deals"]').getByLabel("Organization").selectOption({ label: orgName });
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("link", { name: dealName, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await expect(page.getByText(/Filters:/)).toContainText("Stage: New");
  await expect(page.getByText(/Filters:/)).toContainText(
    `Organization: ${orgName}`,
  );
  expect(page.url()).toContain("stage=New");
  expect(page.url()).toContain(`organizationId=${orgId}`);

  // A reload preserves the filter: same row, same summary, same controls.
  await page.reload();
  await expect(
    page.getByRole("link", { name: dealName, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await expect(page.getByText(/Filters:/)).toContainText("Stage: New");
  await expect(page.locator('form[action="/crm/deals"]').getByLabel("Stage")).toHaveValue("New");
  await expect(page.locator('form[action="/crm/deals"]').getByLabel("Organization")).toHaveValue(orgId);

  // `Clear filters` lands back on the bare list with an empty query string.
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(page).toHaveURL(/\/crm\/deals$/);
  await expect(page.getByText("Filters:")).toHaveCount(0);
});

test("a close-date window keeps its final day and drops the day after", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(JOURNEY_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  const lastDay = `E2E Window Last Day ${Date.now()} ${crypto.randomUUID()}`;
  const dayAfter = `E2E Window Day After ${Date.now()} ${crypto.randomUUID()}`;
  mintedDeals.push(lastDay, dayAfter);
  await createDeal(page, lastDay, { closeDate: "2026-09-30" });
  await createDeal(page, dayAfter, { closeDate: "2026-10-01" });

  await page.goto("/crm/deals");
  await expect(
    page.getByRole("heading", { name: "Deals", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await page.locator('form[action="/crm/deals"]').getByLabel("Close after").fill("2026-09-01");
  await page.locator('form[action="/crm/deals"]').getByLabel("Close before").fill("2026-09-30");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  // The picked last day is inside the window: querying the raw `closeBefore`
  // with `lt` instead of the exclusive bound hides this row.
  await expect(
    page.getByRole("link", { name: lastDay, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  // The day after the picked last day is outside it: `lt` relaxed to `lte`
  // against the exclusive bound keeps this row.
  await expect(
    page.getByRole("link", { name: dayAfter, exact: true }),
  ).toHaveCount(0, NAV_TIMEOUT);

  // The summary names the window with an en dash; the bounds are read from
  // the rendered text, never hand-typed into the assertion.
  const summary = page.getByText(/Filters:/);
  await expect(summary).toBeVisible(NAV_TIMEOUT);
  expect((await summary.textContent()) ?? "").toMatch(/Close: .+ – .+/);

  await page.reload();
  await expect(
    page.getByRole("link", { name: lastDay, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await expect(
    page.getByRole("link", { name: dayAfter, exact: true }),
  ).toHaveCount(0, NAV_TIMEOUT);
});

test("an unknown stage, a malformed date, and a stale organization fall back to the unfiltered table", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(JOURNEY_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  const dealName = `E2E Tolerant Deal ${Date.now()} ${crypto.randomUUID()}`;
  mintedDeals.push(dealName);
  await createDeal(page, dealName);
  const row = page.getByRole("link", { name: dealName, exact: true });

  // Unknown stage: 200, the unfiltered table, `All` selected, no summary.
  const bogus = await page.goto("/crm/deals?stage=Bogus");
  expect(bogus?.status()).toBe(200);
  await expect(row).toBeVisible(NAV_TIMEOUT);
  await expect(page.locator('form[action="/crm/deals"]').getByLabel("Stage")).toHaveValue("");
  await expect(page.getByText("Filters:")).toHaveCount(0);

  // A stage the minted deal is not in hides it; the unknown stage brings
  // it back — the tolerance is a fallback, not a second empty state.
  await page.goto("/crm/deals?stage=Won");
  await expect(row).toHaveCount(0, NAV_TIMEOUT);
  await page.goto("/crm/deals?stage=Bogus");
  await expect(row).toBeVisible(NAV_TIMEOUT);

  // A malformed date is ignored the same way.
  await page.goto("/crm/deals?closeAfter=2026-02-31");
  await expect(row).toBeVisible(NAV_TIMEOUT);
  await expect(page.getByText("Filters:")).toHaveCount(0);

  // A stale organization id renders the unfiltered table with `All`.
  await page.goto(
    "/crm/deals?organizationId=00000000-0000-0000-0000-000000000000",
  );
  await expect(row).toBeVisible(NAV_TIMEOUT);
  await expect(page.locator('form[action="/crm/deals"]').getByLabel("Organization")).toHaveValue("");
  await expect(page.getByText("Filters:")).toHaveCount(0);

  // Filtered-empty copy on all three list pages, via searches that match
  // nothing (the nonce rules out collisions with other runs' rows).
  const nonce = crypto.randomUUID();
  await page.goto(`/crm/deals?q=zzz-no-such-deal-${nonce}`);
  await expect(
    page.getByText("No deals match these filters."),
  ).toBeVisible(NAV_TIMEOUT);
  await page.goto(`/crm/contacts?q=zzz-no-such-contact-${nonce}`);
  await expect(
    page.getByText("No contacts match these filters."),
  ).toBeVisible(NAV_TIMEOUT);
  await page.goto(`/crm/organizations?q=zzz-no-such-org-${nonce}`);
  await expect(
    page.getByText("No organizations match these filters."),
  ).toBeVisible(NAV_TIMEOUT);
});
