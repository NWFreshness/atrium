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
    await expect(
      page.getByRole("link", { name: orgName, exact: true }),
    ).toHaveCount(0, NAV_TIMEOUT);
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

/**
 * 11.4 — sorting, in the browser.
 *
 * Client-side only, on the rows the server already returned: the whole
 * surface is three header buttons per table and `?q=` still filtering. So
 * the assertions are structural — `aria-sort` cycles, cells are monotone in
 * the stated direction, the URL never changes — and never a fixed row order,
 * because the demo tenant accumulates rows from every e2e run and a list
 * assertion would pin a database, not a feature.
 *
 * The two directions are **pinned, not discovered**: Value and Close date
 * are `sortDescFirst`, so their first click is `"descending"`, and every
 * text column's first click is `"ascending"`. A test that accepted either
 * would pass if the pinning silently flipped.
 */
const SORT_TIMEOUT = 60_000;

/** `$75,000.00` -> `75000`. The cells are `formatMoney`, so strip the rest. */
function money(text: string): number {
  return Number(text.replace(/[^0-9.-]/g, ""));
}

/**
 * Reads one column's body cells as text. Indexed by header position, not by
 * class, because the card forbids asserting on CSS-module class names.
 */
async function columnCells(page: Page, columnName: string): Promise<string[]> {
  const cells = page
    .locator("tbody tr")
    .locator(`td:nth-child(${await columnIndex(page, columnName)})`);
  return (await cells.allInnerTexts()).map((t) => t.trim());
}

/**
 * The 1-based `<td>` position for a column, found by its header's DOM text.
 *
 * `textContent`, **not** `innerText`: `.crm-table th` sets
 * `text-transform: uppercase`, and `innerText` returns the *rendered* text,
 * so it reads `"VALUE"` and `"CLOSE DATE"`. Measured in the browser, which
 * is how that was found — the first run of this suite failed every column
 * lookup while the `aria-sort` assertions above it passed.
 *
 * Header text also carries the caret when a column is sorted, so the match
 * is a prefix test against the label.
 */
async function columnIndex(page: Page, columnName: string): Promise<number> {
  const headers = page.getByRole("columnheader");
  const count = await headers.count();
  for (let i = 0; i < count; i += 1) {
    const text = ((await headers.nth(i).textContent()) ?? "").trim();
    if (text.startsWith(columnName)) {
      return i + 1;
    }
  }
  throw new Error(
    `crm-deals: no columnheader starting with "${columnName}" (saw ${count})`,
  );
}

/**
 * The `<th>` for a column, by its button's accessible name. The name is the
 * label alone (the caret is `aria-hidden`), so this matches exactly — which
 * is itself part of what AC3 pins.
 */
function sortHeader(page: Page, name: string) {
  return page
    .getByRole("columnheader")
    .filter({ has: page.getByRole("button", { name, exact: true }) });
}

test("a deals header cycles aria-sort through descending, ascending, and none while the URL holds", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(SORT_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);
  await page.goto("/crm/deals");
  await expect(
    page.getByRole("heading", { name: "Deals", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);

  const urlBefore = page.url();
  const header = sortHeader(page, "Value");
  await expect(header).toHaveAttribute("aria-sort", "none", NAV_TIMEOUT);

  // Click 1: `sortDescFirst: true` on Value, so descending first.
  await header.getByRole("button", { name: "Value", exact: true }).click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  const desc = (await columnCells(page, "Value")).map(money);
  expect(desc.length).toBeGreaterThan(1);
  for (let i = 1; i < desc.length; i += 1) {
    expect(desc[i - 1]).toBeGreaterThanOrEqual(desc[i]);
  }

  // Click 2: the other direction.
  await header.getByRole("button", { name: "Value", exact: true }).click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  const asc = (await columnCells(page, "Value")).map(money);
  for (let i = 1; i < asc.length; i += 1) {
    expect(asc[i - 1]).toBeLessThanOrEqual(asc[i]);
  }

  // Click 3: back to the server's own order, which is what "none" means
  // here — no `ORDER BY` is added by 11.4.
  await header.getByRole("button", { name: "Value", exact: true }).click();
  await expect(header).toHaveAttribute("aria-sort", "none");

  // AC5: sorting is client-side. Nothing navigated, nothing re-queried.
  expect(page.url()).toBe(urlBefore);
});

test("a text header cycles ascending first and Actions has no sort affordance at all", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(SORT_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);
  await page.goto("/crm/deals");
  await expect(
    page.getByRole("heading", { name: "Deals", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);

  const nameHeader = sortHeader(page, "Name");
  await expect(nameHeader).toHaveAttribute("aria-sort", "none", NAV_TIMEOUT);
  await nameHeader.getByRole("button", { name: "Name", exact: true }).click();
  await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  const names = (await columnCells(page, "Name")).filter(Boolean);
  expect(names.length).toBeGreaterThan(1);
  const sorted = [...names].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase(), "en"),
  );
  expect(names).toEqual(sorted);

  // AC4: `aria-sort` belongs to the header **cell**, never the button.
  await expect(
    nameHeader.getByRole("button", { name: "Name", exact: true }),
  ).not.toHaveAttribute("aria-sort", /.*/);

  // AC4: the Actions column carries no `aria-sort` and no button.
  const actions = sortHeader(page, "Actions");
  await expect(actions).toHaveCount(0);
  const actionsHeader = page
    .getByRole("columnheader")
    .filter({ hasText: "Actions" });
  await expect(actionsHeader).toHaveAttribute("scope", "col");
  expect(await actionsHeader.getAttribute("aria-sort")).toBeNull();
  await expect(
    actionsHeader.getByRole("button", { name: "Actions", exact: true }),
  ).toHaveCount(0);
});

test("contacts sort by the visible organization name, not by the raw id", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(SORT_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);
  await page.goto("/crm/contacts");
  await expect(
    page.getByRole("heading", { name: "Contacts", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);

  const header = sortHeader(page, "Organization");
  await header
    .getByRole("button", { name: "Organization", exact: true })
    .click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");

  // The seed's org names (Bluepeak / Harbor & Lane / Northwind) sort in a
  // different order than their uuids do, which is what makes this assertion
  // bite if the comparator regresses to the raw id. No fixed list is
  // asserted — the demo tenant accumulates contacts across runs.
  const orgs = (await columnCells(page, "Organization")).filter(Boolean);
  expect(orgs.length).toBeGreaterThan(1);
  const sorted = [...orgs].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase(), "en"),
  );
  expect(orgs).toEqual(sorted);
});

test("q= still narrows and sorting still orders the narrowed rows", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(SORT_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  // AC7: the empty state still renders, and sorting did not replace the
  // `length === 0` branch with a headers-only table.
  await page.goto("/crm/organizations?q=zzzz-no-such-org");
  await expect(page.getByText("No organizations")).toBeVisible(NAV_TIMEOUT);

  // AC5: `?q=` filters on the server; the browser sorts what came back.
  await page.goto("/crm/organizations?q=e");
  await expect(
    page.getByRole("heading", { name: "Organizations", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  const urlBefore = page.url();
  expect(urlBefore).toContain("q=e");

  const header = sortHeader(page, "Name");
  await header.getByRole("button", { name: "Name", exact: true }).click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  const names = (await columnCells(page, "Name")).filter(Boolean);
  expect(names.length).toBeGreaterThan(1);
  const sorted = [...names].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase(), "en"),
  );
  expect(names).toEqual(sorted);
  // The filter param survives the sort click untouched — no `?sort=` was
  // added, and none was removed.
  expect(page.url()).toBe(urlBefore);
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
  await expect(dealRow).toContainText(orgName, {
    timeout: NAV_TIMEOUT.timeout,
  });

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

/**
 * 11.5 — edit from the detail pages, in the browser.
 *
 * One journey per record type. Each detail page carries a single
 * `Edit {name}` control beside the title (and no Add affordance); opening
 * it focuses the form's Name input, saving shows in the server-rendered
 * `<dd>` after a reload, and every edited field is restored to its prior
 * value so reruns are stable. Escape closes with focus back on the
 * trigger; loading the page steals no focus. Dialog locators are scoped
 * by `role="dialog"`, never by `body`.
 */

/**
 * Mirrors `createOrganization` for contacts: creates through the list-page
 * dialog and leaves the row's link on screen so the journey can read the
 * id off its href. The contact is deleted in the journey body —
 * `afterEach` only scrubs deals and orgs.
 */
async function createContact(page: Page, name: string, jobTitle: string) {
  await page.goto("/crm/contacts");
  await expect(
    page.getByRole("heading", { name: "Contacts", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await page.getByRole("button", { name: "Add contact", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add contact" });
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByLabel("Job title", { exact: true }).fill(jobTitle);
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
    throw new Error(`crm-deals: row link for ${name} has no id in its href`);
  }
  return id;
}

test("an organization edits industry from its detail page and the dl reflects it after reload (11.5 Journey H)", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(G_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  const name = `E2E Detail Org ${Date.now()} ${crypto.randomUUID()}`;
  mintedOrg = name;
  await createOrganization(page, name);
  const id = await idFromRowLink(page, name);

  await page.goto(`/crm/organizations/${id}`);
  const heading = page.getByRole("heading", { name, level: 1, exact: true });
  await expect(heading).toBeVisible(NAV_TIMEOUT);

  // Loading the page steals no focus, and there is no Add affordance here.
  await expect(heading).not.toBeFocused();
  await expect(
    page.getByRole("button", { name: "Add organization", exact: true }),
  ).toHaveCount(0);

  const edit = page.getByRole("button", { name: `Edit ${name}`, exact: true });
  await edit.click();
  const dialog = page.getByRole("dialog", {
    name: `Edit ${name}`,
    exact: true,
  });
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  // Autofocus lands on Name.
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();

  await dialog.getByLabel("Industry", { exact: true }).fill("Harbor testing");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);

  await page.reload();
  await expect(
    page.locator("dl").getByText("Harbor testing", { exact: true }),
  ).toBeVisible(NAV_TIMEOUT);

  // Escape closes and focus returns to the control that opened the dialog.
  await edit.click();
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await expect(edit).toBeFocused();

  // Restore the prior value (empty) so reruns are stable.
  await edit.click();
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await dialog.getByLabel("Industry", { exact: true }).fill("");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await page.reload();
  await expect(
    page.locator("dl").getByText("Harbor testing", { exact: true }),
  ).toHaveCount(0, NAV_TIMEOUT);
});

test("a contact edits job title from its detail page and the dl reflects it after reload (11.5 Journey I)", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(G_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  const name = `E2E Detail Contact ${Date.now()} ${crypto.randomUUID()}`;
  await createContact(page, name, "First title");
  const id = await idFromRowLink(page, name);

  await page.goto(`/crm/contacts/${id}`);
  const heading = page.getByRole("heading", { name, level: 1, exact: true });
  await expect(heading).toBeVisible(NAV_TIMEOUT);

  await expect(heading).not.toBeFocused();
  await expect(
    page.getByRole("button", { name: "Add contact", exact: true }),
  ).toHaveCount(0);
  // The inline activity submit adds an activity *to* this record and stays.
  await expect(
    page.getByRole("button", { name: "Add activity", exact: true }),
  ).toBeVisible();

  const edit = page.getByRole("button", { name: `Edit ${name}`, exact: true });
  await edit.click();
  const dialog = page.getByRole("dialog", {
    name: `Edit ${name}`,
    exact: true,
  });
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();

  await dialog.getByLabel("Job title", { exact: true }).fill("Second title");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);

  await page.reload();
  await expect(
    page.locator("dl").getByText("Second title", { exact: true }),
  ).toBeVisible(NAV_TIMEOUT);

  await edit.click();
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await expect(edit).toBeFocused();

  await edit.click();
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await dialog.getByLabel("Job title", { exact: true }).fill("First title");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await page.reload();
  await expect(
    page.locator("dl").getByText("First title", { exact: true }),
  ).toBeVisible(NAV_TIMEOUT);

  // `afterEach` scrubs only deals and orgs, so this journey deletes its
  // own contact. The shared-handler trap applies: page.once, never page.on.
  page.once("dialog", (dialog) => void dialog.accept());
  await page.goto("/crm/contacts");
  const remove = page.getByRole("button", {
    name: `Delete ${name}`,
    exact: true,
  });
  await remove.first().click();
  await expect(remove).toHaveCount(0, NAV_TIMEOUT);
  await expect(page.getByRole("link", { name, exact: true })).toHaveCount(
    0,
    NAV_TIMEOUT,
  );
});

test("a deal edits value from its detail page and the dl reflects it after reload (11.5 Journey J)", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(G_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  const orgName = `E2E Detail Deal Org ${Date.now()} ${crypto.randomUUID()}`;
  const dealName = `E2E Detail Deal ${Date.now()} ${crypto.randomUUID()}`;
  mintedOrg = orgName;
  minted = dealName;
  await createOrganization(page, orgName);
  const orgId = await idFromRowLink(page, orgName);
  await createDeal(page, dealName, orgId);
  const dealId = await idFromRowLink(page, dealName);

  await page.goto(`/crm/deals/${dealId}`);
  const heading = page.getByRole("heading", {
    name: dealName,
    level: 1,
    exact: true,
  });
  await expect(heading).toBeVisible(NAV_TIMEOUT);

  await expect(heading).not.toBeFocused();
  await expect(
    page.getByRole("button", { name: "Add deal", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add activity", exact: true }),
  ).toBeVisible();

  const edit = page.getByRole("button", {
    name: `Edit ${dealName}`,
    exact: true,
  });
  await edit.click();
  const dialog = page.getByRole("dialog", {
    name: `Edit ${dealName}`,
    exact: true,
  });
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();

  await dialog.getByLabel("Value", { exact: true }).fill("2500");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);

  await page.reload();
  await expect(
    page.locator("dl").getByText("$2,500.00", { exact: true }),
  ).toBeVisible(NAV_TIMEOUT);

  await edit.click();
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await expect(edit).toBeFocused();

  await edit.click();
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await dialog.getByLabel("Value", { exact: true }).fill("1000");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await page.reload();
  await expect(
    page.locator("dl").getByText("$1,000.00", { exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
});
