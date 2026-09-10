import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;

const DEMO_SEED_PEOPLE = ["Maya Chen", "Sam Okoye", "Kate Okoye"] as const;

const SECTIONS = [
  { href: "/rolodex", label: "Today" },
  { href: "/rolodex/people", label: "People" },
  { href: "/rolodex/circles", label: "Circles" },
  { href: "/rolodex/calendar", label: "Calendar" },
  { href: "/rolodex/timeline", label: "Timeline" },
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

function rolodexNav(page: Page) {
  return page.getByRole("navigation", { name: "Rolodex" });
}

test("unauthenticated /rolodex redirects to login", async ({ page }) => {
  await page.goto("/rolodex");
  await expect(page).toHaveURL(/\/login/);
});

test("demo walks Rolodex Today, subnav, and seed people", async ({ page }) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );

  await login(page, demoEmail!, demoPassword!);
  await page.goto("/rolodex");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Who to contact" }),
  ).toBeVisible();

  for (const section of SECTIONS) {
    await rolodexNav(page)
      .getByRole("link", { name: section.label, exact: true })
      .click();
    await expect(page).toHaveURL(
      section.href === "/rolodex" ? /\/rolodex$/ : section.href,
      { timeout: 15000 },
    );
    await expect(
      page.getByRole("heading", { name: section.label, level: 1 }),
    ).toBeVisible({ timeout: 15000 });
  }

  await rolodexNav(page)
    .getByRole("link", { name: "People", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "People", level: 1 }),
  ).toBeVisible({ timeout: 15000 });
  for (const name of DEMO_SEED_PEOPLE) {
    await expect(page.getByRole("link", { name })).toBeVisible();
  }
});

test("demo can create a person and still see them after reload", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );

  await login(page, demoEmail!, demoPassword!);
  await page.goto("/rolodex/people");
  await expect(
    page.getByRole("heading", { name: "People", level: 1 }),
  ).toBeVisible();

  const name = `E2E Person ${Date.now()}`;
  await page.getByRole("button", { name: "Add person" }).click();
  const dialog = page.getByRole("dialog", { name: "Add person" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("link", { name })).toBeVisible({
    timeout: 15000,
  });

  await page.reload();
  await expect(page.getByRole("link", { name })).toBeVisible({
    timeout: 15000,
  });
  for (const seed of DEMO_SEED_PEOPLE) {
    await expect(page.getByRole("link", { name: seed })).toBeVisible();
  }
});

test("owner Rolodex people do not show demo seed names", async ({ page }) => {
  await login(page, ownerEmail!, ownerPassword!);
  await page.goto("/rolodex");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

  await rolodexNav(page)
    .getByRole("link", { name: "People", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "People", level: 1 }),
  ).toBeVisible();
  for (const name of DEMO_SEED_PEOPLE) {
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  }
});
