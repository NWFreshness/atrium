import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;

const DEMO_SEED_PAGES = ["Home", "Projects", "Travel"] as const;

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

function spaceNav(page: Page) {
  return page.getByRole("complementary", { name: "Space pages" });
}

test("unauthenticated /space redirects to login", async ({ page }) => {
  await page.goto("/space");
  await expect(page).toHaveURL(/\/login/);
});

test("demo walks Space seed pages including a database", async ({ page }) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );

  await login(page, demoEmail!, demoPassword!);
  await page.goto("/space");
  const nav = spaceNav(page);
  await expect(nav).toBeVisible();
  for (const title of DEMO_SEED_PAGES) {
    await expect(nav.getByRole("link", { name: title, exact: true })).toBeVisible();
  }

  await nav.getByRole("link", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true, level: 1 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "New database" }).click();
  await expect(page.getByRole("heading", { name: "Untitled" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Table" })).toBeVisible();
});

test("demo can create and rename a page and still see it after reload", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );

  await login(page, demoEmail!, demoPassword!);
  await page.goto("/space");
  const nav = spaceNav(page);
  await expect(nav).toBeVisible();

  await page.getByRole("button", { name: "New page" }).click();
  await expect(page.getByRole("heading", { name: "Untitled" })).toBeVisible();

  const name = `E2E Space ${Date.now()}`;
  await nav.getByRole("button", { name: "Rename Untitled" }).last().click();
  const renameField = nav.getByRole("textbox", { name: "Rename Untitled" });
  await renameField.fill(name);
  await renameField.press("Enter");
  await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();

  await page.reload();
  await expect(spaceNav(page).getByRole("link", { name, exact: true })).toBeVisible();
  await expect(
    spaceNav(page).getByRole("link", { name: "Home", exact: true }),
  ).toBeVisible();
});

test("owner Space pages do not show demo seed titles", async ({ page }) => {
  await login(page, ownerEmail!, ownerPassword!);
  await page.goto("/space");
  const nav = spaceNav(page);
  await expect(nav).toBeVisible();
  for (const title of DEMO_SEED_PAGES) {
    await expect(nav.getByRole("link", { name: title, exact: true })).toHaveCount(0);
  }
});
