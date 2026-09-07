import { expect, test } from "@playwright/test";

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;

test.beforeAll(() => {
  if (!ownerEmail || !ownerPassword) {
    throw new Error(
      "AUTH_OWNER_EMAIL and AUTH_OWNER_PASSWORD are required for e2e",
    );
  }
});

async function loginAsOwner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ownerEmail!);
  await page.getByLabel("Password").fill(ownerPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

test("login shows four launcher cards", async ({ page }) => {
  await loginAsOwner(page);

  const launcher = page.locator("main");
  await expect(launcher.getByRole("link", { name: "CRM" })).toBeVisible();
  await expect(launcher.getByRole("link", { name: "Space" })).toBeVisible();
  await expect(launcher.getByRole("link", { name: "Rolodex" })).toBeVisible();
  await expect(launcher.getByRole("link", { name: "Groove" })).toBeVisible();
});

test("theme toggle flips data-theme and survives reload", async ({ page }) => {
  await loginAsOwner(page);
  await expect(page.getByRole("button", { name: "Theme" })).toBeVisible();

  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  expect(before === "light" || before === "dark").toBe(true);

  await page.getByRole("button", { name: "Theme" }).click();

  const after = before === "dark" ? "light" : "dark";
  await expect(html).toHaveAttribute("data-theme", after);

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", after);
});
