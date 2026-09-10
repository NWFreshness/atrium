/**
 * Phase 5.7 — the Workroom QA gate.
 *
 * Three things have to hold across the whole product, and none of them are visible
 * to a unit test:
 *
 *  1. the theme still re-themes every surface and survives a reload (dark = espresso,
 *     light = warm paper, Groove stays instrument-dark on a paper page);
 *  2. every top-nav, subnav, and sidebar tab is a real route — the defect this exists
 *     to catch is a tab that navigates nowhere (the static prototype's `href="#"`),
 *     which a "no console errors" walk would happily call green;
 *  3. walking the launcher and all four apps logs no error.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;

// The seeded demo tenant is what makes the subnav/tree walks meaningful; fall back to
// owner so the theme and chrome gates still run without the demo pair.
const email = demoEmail ?? ownerEmail;
const password =
  demoEmail && demoPassword ? demoPassword : (ownerPassword ?? null);

/** Workroom surfaces, straight from app/globals.css --bg-0. */
const ESPRESSO = "rgb(19, 16, 12)"; // :root (dark)
const PAPER = "rgb(236, 229, 214)"; // [data-theme="light"]

test.beforeAll(() => {
  if (!email || !password) {
    throw new Error(
      "AUTH_DEMO_EMAIL/AUTH_DEMO_PASSWORD (or the owner pair) are required for e2e",
    );
  }
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

const themeButton = (page: Page) =>
  page.getByRole("button", { name: "Toggle theme" });

const html = (page: Page) => page.locator("html");

const appliedTheme = (page: Page) => html(page).getAttribute("data-theme");

/** The document surface, i.e. the theme actually reaching the page background. */
const bodyBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** Toggle until the requested theme is applied (one click always flips). */
async function setTheme(page: Page, wanted: "dark" | "light") {
  if ((await appliedTheme(page)) === wanted) {
    return;
  }
  await themeButton(page).click();
  await expect(html(page)).toHaveAttribute("data-theme", wanted);
}

test("unauthenticated / redirects to a themed login screen", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);

  // Workroom chrome reaches the login screen: the shared field/button classes are
  // the presentational layer 5.2 introduced, not per-app CSS.
  await expect(page.locator(".atrium-field")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Sign in" })).toHaveClass(
    /atrium-btn-primary/,
  );

  const background = await bodyBackground(page);
  expect([ESPRESSO, PAPER]).toContain(background);
});

test("dark is espresso, light is paper, and the choice survives reload", async ({
  page,
}) => {
  await login(page);

  await setTheme(page, "dark");
  expect(await bodyBackground(page)).toBe(ESPRESSO);
  // The gate the spec calls out explicitly: a warm surface, not flat black.
  expect(await bodyBackground(page)).not.toBe("rgb(0, 0, 0)");

  await themeButton(page).click();
  await expect(html(page)).toHaveAttribute("data-theme", "light");
  expect(await bodyBackground(page)).toBe(PAPER);
  expect(await bodyBackground(page)).not.toBe("rgb(255, 255, 255)");

  await page.reload();
  await expect(html(page)).toHaveAttribute("data-theme", "light");
  expect(await bodyBackground(page)).toBe(PAPER);
  expect(await page.evaluate(() => localStorage.getItem("atrium.theme"))).toBe(
    "light",
  );
});

test("Groove stays instrument-dark on a paper page", async ({ page }) => {
  await login(page);
  await setTheme(page, "light");
  await page.goto("/groove");
  await expect(page.getByRole("region", { name: "RHYTHM" })).toBeVisible();

  expect(await bodyBackground(page)).toBe(PAPER);

  const chassis = await page.locator(".groove-chassis").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      panel: style.getPropertyValue("--inst-panel").trim(),
      ink: style.getPropertyValue("--inst-ink").trim(),
      color: style.color,
    };
  });
  // Groove declares its own instrument tokens and never re-skins for paper.
  expect(chassis.panel).toBe("#1a1510");
  expect(chassis.ink).toBe("#f4ecdc");
  expect(chassis.color).toBe("rgb(244, 236, 220)");
});

const TOP_NAV = [
  { name: "Home", href: "/", url: /\/$/ },
  { name: "CRM", href: "/crm", url: /\/crm$/ },
  // /space redirects to the first sidebar page once one exists.
  { name: "Space", href: "/space", url: /\/space(\/[0-9a-f-]{36})?$/ },
  { name: "Rolodex", href: "/rolodex", url: /\/rolodex$/ },
  { name: "Groove", href: "/groove", url: /\/groove$/ },
];

const CRM_SUBNAV = [
  { name: "Dashboard", href: "/crm", url: /\/crm$/ },
  {
    name: "Organizations",
    href: "/crm/organizations",
    url: /\/crm\/organizations$/,
  },
  { name: "Contacts", href: "/crm/contacts", url: /\/crm\/contacts$/ },
  { name: "Deals", href: "/crm/deals", url: /\/crm\/deals$/ },
  { name: "Pipeline", href: "/crm/pipeline", url: /\/crm\/pipeline$/ },
];

const ROLODEX_SUBNAV = [
  { name: "Today", href: "/rolodex", url: /\/rolodex$/ },
  { name: "People", href: "/rolodex/people", url: /\/rolodex\/people$/ },
  { name: "Circles", href: "/rolodex/circles", url: /\/rolodex\/circles$/ },
  { name: "Calendar", href: "/rolodex/calendar", url: /\/rolodex\/calendar$/ },
  { name: "Timeline", href: "/rolodex/timeline", url: /\/rolodex\/timeline$/ },
];

/**
 * `/rolodex` renders the Today dashboard off the whole demo tenant, which under a
 * loaded dev DB takes seconds — the 5 s default times these clicks out. The walk
 * itself touches thirteen screens, so the per-test budget goes up as well: the
 * default 30 s cap is the whole suite's problem, not one assertion's.
 */
const NAV_TIMEOUT = { timeout: 20_000 };
const WALK_TEST_TIMEOUT = 180_000;

async function walk(
  page: Page,
  nav: Locator,
  tabs: { name: string; href: string; url: RegExp }[],
) {
  for (const tab of tabs) {
    const link = nav.getByRole("link", { name: tab.name, exact: true });
    await expect(link).toHaveAttribute("href", tab.href);
    await link.click();
    await expect(page).toHaveURL(tab.url, NAV_TIMEOUT);
  }
}

test("every top-nav and subnav tab resolves to a real route", async ({
  page,
}) => {
  test.setTimeout(WALK_TEST_TIMEOUT);
  await login(page);

  // Start on the last app so the first nav click is a genuine cross-app navigation.
  await page.goto("/groove");
  await walk(page, page.getByRole("navigation", { name: "Atrium" }), TOP_NAV);

  await page.goto("/crm");
  await walk(page, page.getByRole("navigation", { name: "CRM" }), CRM_SUBNAV);

  await page.goto("/rolodex/timeline");
  await walk(
    page,
    page.getByRole("navigation", { name: "Rolodex" }),
    ROLODEX_SUBNAV,
  );

  // Space has no subnav; its navigation is the page tree in the sidebar.
  await page.goto("/space");
  const sidebar = page.getByRole("complementary", { name: "Space pages" });
  await expect(sidebar).toBeVisible();

  const treeLinks = sidebar.getByRole("link");
  if ((await treeLinks.count()) === 0) {
    // Owner tenant: no pages, but the landing screen must still be a real screen.
    await expect(page.getByText("Pick a page")).toBeVisible();
    return;
  }

  const href = await treeLinks.first().getAttribute("href");
  expect(href).toMatch(/^\/space\/[0-9a-f-]{36}$/);
  await treeLinks.first().click();
  await expect(page).toHaveURL(new RegExp(`${href}$`), NAV_TIMEOUT);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

/** Every screen the redesign touched, with the h1 each one must render. */
const WALK: { path: string; h1?: string }[] = [
  { path: "/", h1: "Atrium" },
  { path: "/crm", h1: "Dashboard" },
  { path: "/crm/organizations", h1: "Organizations" },
  { path: "/crm/contacts", h1: "Contacts" },
  { path: "/crm/deals", h1: "Deals" },
  { path: "/crm/pipeline", h1: "Pipeline" },
  { path: "/space" },
  { path: "/rolodex", h1: "Today" },
  { path: "/rolodex/people", h1: "People" },
  { path: "/rolodex/circles", h1: "Circles" },
  { path: "/rolodex/calendar", h1: "Calendar" },
  { path: "/rolodex/timeline", h1: "Timeline" },
  { path: "/groove", h1: "Groove" },
];

test("walking the launcher and all four apps logs no console errors", async ({
  page,
}) => {
  test.setTimeout(WALK_TEST_TIMEOUT);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await login(page);
  try {
    for (const step of WALK) {
      await page.goto(step.path);
      await expect(page.locator("main").first()).toBeVisible(NAV_TIMEOUT);
      if (step.h1) {
        await expect(
          page.getByRole("heading", { name: step.h1, level: 1, exact: true }),
        ).toBeVisible(NAV_TIMEOUT);
      }
    }
  } finally {
    // Headed runs play sound; best-effort stop before the page is reused.
    await page
      .getByRole("button", { name: /STOP/ })
      .first()
      .click({ timeout: 1000 })
      .catch(() => {});
  }

  expect(errors).toEqual([]);
});
