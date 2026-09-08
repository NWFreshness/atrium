import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;

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

test("unauthenticated /crm redirects to login", async ({ page }) => {
  await page.goto("/crm");
  await expect(page).toHaveURL(/\/login/);
});

test("demo walks CRM dashboard, subnav, and seed organizations", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );

  await login(page, demoEmail!, demoPassword!);
  await page.goto("/crm");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Open deals")).toBeVisible();
  await expect(page.getByText("Pipeline value")).toBeVisible();

  for (const section of ["Organizations", "Contacts", "Deals", "Pipeline"]) {
    await crmNav(page).getByRole("link", { name: section }).click();
    await expect(page.getByRole("heading", { name: section, level: 1 })).toBeVisible();
  }

  await crmNav(page).getByRole("link", { name: "Organizations" }).click();
  await expect(
    page.getByRole("heading", { name: "Organizations", level: 1 }),
  ).toBeVisible();
  for (const name of DEMO_SEED_ORGS) {
    await expect(page.getByRole("link", { name })).toBeVisible();
  }
});

test("demo can create an organization and still see it after reload", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );

  await login(page, demoEmail!, demoPassword!);
  await page.goto("/crm/organizations");
  await expect(
    page.getByRole("heading", { name: "Organizations", level: 1 }),
  ).toBeVisible();

  const name = `E2E Org ${Date.now()}`;
  await page.getByRole("button", { name: "Add organization" }).click();
  const dialog = page.getByRole("dialog", { name: "Add organization" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("link", { name })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("link", { name })).toBeVisible();
  for (const seed of DEMO_SEED_ORGS) {
    await expect(page.getByRole("link", { name: seed })).toBeVisible();
  }
});

test("owner CRM organizations do not show demo seed names", async ({
  page,
}) => {
  await login(page, ownerEmail!, ownerPassword!);
  await page.goto("/crm");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await crmNav(page).getByRole("link", { name: "Organizations" }).click();
  await expect(
    page.getByRole("heading", { name: "Organizations", level: 1 }),
  ).toBeVisible();
  for (const name of DEMO_SEED_ORGS) {
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  }
});
