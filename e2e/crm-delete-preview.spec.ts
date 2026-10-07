/**
 * 11.7 — deleting a row first previews what the delete will unlink.
 *
 * One journey, three branches on the organizations table: an organization
 * with one linked deal confirms with the exact consequence message, a
 * dependent-free organization confirms with the bare `Delete {name}?`
 * string, and dismissing the confirm leaves the row present after reload.
 * Every row touched is minted with a `Date.now()` suffix; no seeded row
 * is deleted.
 */
import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;

/**
 * Throws without the owner pair even though the journey is demo-only — the
 * same shape as the rest of the CRM e2e suite, gated on the six-secret
 * contract.
 */
test.beforeAll(() => {
  if (!ownerEmail || !ownerPassword) {
    throw new Error(
      "AUTH_OWNER_EMAIL and AUTH_OWNER_PASSWORD are required for e2e",
    );
  }
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

/**
 * A dev-server action against a loaded database takes seconds on a cold
 * route, so the 5 s default per-assertion timeout times these journeys
 * out. Mirrors `e2e/crm-deals.spec.ts`.
 */
const NAV_TIMEOUT = { timeout: 20_000 };
const JOURNEY_TIMEOUT = 120_000;

/**
 * The names the currently running test minted, so `afterEach` can delete
 * them. Cleanup targets, not fixtures; each is cleared by the cleanup that
 * reads it, or nulled by the journey once it deletes the row itself.
 */
let mintedDeal: string | null = null;
let mintedLinkedOrg: string | null = null;
let mintedBareOrg: string | null = null;

/**
 * A function, not a Playwright fixture: takes a `name` argument and returns
 * nothing. Mirrors the org create in `e2e/crm.spec.ts:81-87`.
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
  await expect(
    page.getByRole("link", { name, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
}

async function organizationId(page: Page, name: string): Promise<string> {
  const href = await page
    .getByRole("link", { name, exact: true })
    .getAttribute("href");
  const id = href?.split("/").pop();
  if (!id) {
    throw new Error(`no id in organization link href: ${href}`);
  }
  return id;
}

/**
 * Mirrors the deal create in `e2e/crm-deals.spec.ts`, narrowed to the one
 * case this journey needs: a deal linked to an organization by id.
 */
async function createDeal(
  page: Page,
  name: string,
  linkedOrganizationId: string,
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
  await dialog
    .getByLabel("Organization", { exact: true })
    .selectOption(linkedOrganizationId);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await expect(
    page.getByRole("link", { name, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
}

test.afterEach(async ({ page }) => {
  const dealName = mintedDeal;
  const linkedName = mintedLinkedOrg;
  const bareName = mintedBareOrg;
  mintedDeal = null;
  mintedLinkedOrg = null;
  mintedBareOrg = null;
  // Cleanup listeners are additive and best-effort: clear first so a
  // leftover in-test handler cannot double-fire on the same dialog.
  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) => void dialog.accept());
  if (dealName) {
    await page.goto("/crm/deals");
    const remove = page.getByRole("button", {
      name: `Delete ${dealName}`,
      exact: true,
    });
    if ((await remove.count()) > 0) {
      await remove.first().click();
      await expect(remove).toHaveCount(0, NAV_TIMEOUT);
    }
    await expect(
      page.getByRole("link", { name: dealName, exact: true }),
    ).toHaveCount(0, NAV_TIMEOUT);
  }
  for (const orgName of [linkedName, bareName]) {
    if (!orgName) {
      continue;
    }
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

test("delete preview names unlinked rows, stays bare when free, cancel keeps the row", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(JOURNEY_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  // Non-zero branch: an organization with one linked deal.
  const linkedOrg = `E2E Preview Org ${Date.now()}`;
  mintedLinkedOrg = linkedOrg;
  await createOrganization(page, linkedOrg);
  const linkedOrgId = await organizationId(page, linkedOrg);
  const deal = `E2E Preview Deal ${Date.now()}`;
  mintedDeal = deal;
  await createDeal(page, deal, linkedOrgId);

  await page.goto("/crm/organizations");
  const removeLinked = page.getByRole("button", {
    name: `Delete ${linkedOrg}`,
    exact: true,
  });
  await expect(removeLinked).toBeVisible(NAV_TIMEOUT);
  const linkedMessage = new Promise<string>((resolve) => {
    // page.once, not page.on: the shared-cleanup afterEach also listens for dialogs.
    page.once("dialog", (dialog) => {
      const message = dialog.message();
      void dialog.accept();
      resolve(message);
    });
  });
  await removeLinked.click();
  await expect(await linkedMessage).toBe(
    `Delete ${linkedOrg}?\nThis will unlink 1 deal.`,
  );
  await expect(
    page.getByRole("link", { name: linkedOrg, exact: true }),
  ).toHaveCount(0, NAV_TIMEOUT);
  mintedLinkedOrg = null;

  // Zero branch: a dependent-free organization confirms with the bare string.
  const bareOrg = `E2E Bare Org ${Date.now()}`;
  mintedBareOrg = bareOrg;
  await createOrganization(page, bareOrg);

  await page.goto("/crm/organizations");
  const removeBare = page.getByRole("button", {
    name: `Delete ${bareOrg}`,
    exact: true,
  });
  await expect(removeBare).toBeVisible(NAV_TIMEOUT);
  const bareMessage = new Promise<string>((resolve) => {
    // page.once, not page.on: the shared-cleanup afterEach also listens for dialogs.
    page.once("dialog", (dialog) => {
      const message = dialog.message();
      void dialog.dismiss();
      resolve(message);
    });
  });
  await removeBare.click();
  await expect(await bareMessage).toBe(`Delete ${bareOrg}?`);

  // Cancel branch: dismissing the confirm deletes nothing.
  await page.reload();
  await expect(
    page.getByRole("link", { name: bareOrg, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
});
