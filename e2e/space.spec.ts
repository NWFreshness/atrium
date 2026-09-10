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
    await expect(
      nav.getByRole("link", { name: title, exact: true }),
    ).toBeVisible();
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
  await expect(
    spaceNav(page).getByRole("link", { name, exact: true }),
  ).toBeVisible();
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
    await expect(
      nav.getByRole("link", { name: title, exact: true }),
    ).toHaveCount(0);
  }
});

test("the add-block picker creates the chosen block type, not just text", async ({
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

  // Work on a page of our own so the seeded demo content is left untouched.
  await page.getByRole("button", { name: "New page" }).click();
  await expect(page.getByRole("heading", { name: "Untitled" })).toBeVisible();

  const untitled = nav.getByRole("link", { name: "Untitled", exact: true });
  await expect(untitled.last()).toBeVisible();
  const before = await untitled.count();
  const meta = page.locator("[class*='space-editor-meta']");
  await expect(meta).toContainText("1 block");

  // The affordance offers every block type, not a single "text" action.
  const addBlock = page.getByRole("button", { name: "Add a block" });
  await expect(addBlock).toHaveAttribute("aria-haspopup", "listbox");
  await addBlock.click();
  const picker = page.getByRole("listbox", { name: "Block types" });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("option")).toHaveCount(11);

  // ...and the choice actually lands as that block type.
  await picker.getByRole("option", { name: "Divider" }).click();
  await expect(picker).toBeHidden();
  await expect(page.locator("hr[class*='space-block-rule']")).toHaveCount(1);
  await expect(meta).toContainText("2 blocks");

  await addBlock.click();
  await page
    .getByRole("listbox", { name: "Block types" })
    .getByRole("option", { name: "Heading 2" })
    .click();
  await expect(page.getByRole("textbox", { name: "heading2" })).toHaveCount(1);
  await expect(meta).toContainText("3 blocks");

  // Escape closes the picker without adding anything.
  await addBlock.click();
  await expect(picker).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await expect(meta).toContainText("3 blocks");

  // Leave the demo tree as we found it.
  page.on("dialog", (dialog) => void dialog.accept());
  await nav.getByRole("button", { name: "Delete Untitled" }).last().click();
  await expect(untitled).toHaveCount(before - 1);
});
