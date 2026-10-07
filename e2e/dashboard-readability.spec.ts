/**
 * 13.2 dashboard readability + light default (JOB-007).
 *
 * AC1: every pipeline-funnel stage label/value on /crm is legible — no two
 *   funnel label boxes intersect at 375 / 768 / 1024 / 1440px.
 * AC3: every Recent-activity item renders a visible separator (non-zero
 *   boundary on each item) and adjacent items are separated.
 * AC4: first visit (cleared storage) renders light even under a dark OS
 *   preference; the shared-chrome toggle flips dark/light and the choice
 *   survives reload.
 *
 * The authenticated section skips without an auth pair, following the
 * e2e/ui-refresh.spec.ts pattern. This pass runs in addition to
 * `env -u DATABASE_URL npm test && AUTH_SECRET=ci-build-placeholder npm run build`,
 * never instead of it.
 */
import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [375, 768, 1024, 1440] as const;

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;

// The seeded demo tenant is what makes the dashboard walks meaningful; fall
// back to owner so the chrome gates still run without the demo pair.
const email = demoEmail ?? ownerEmail;
const password =
  demoEmail && demoPassword ? demoPassword : (ownerPassword ?? null);

/** PNW surfaces, straight from app/globals.css --bg-0. */
const BASALT = "rgb(37, 40, 42)"; // :root (dark)
const MIST = "rgb(238, 241, 242)"; // [data-theme="light"]

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

const funnelSection = (page: Page) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Pipeline funnel" }) });

const activitySection = (page: Page) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Recent activity" }) });

const bodyBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe("authenticated dashboard readability", () => {
  test.skip(
    !email || !password,
    "AUTH_DEMO_EMAIL/AUTH_DEMO_PASSWORD (or the owner pair) are required for e2e",
  );

  for (const width of WIDTHS) {
    test(`funnel labels never overlap at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await login(page);
      await page.goto("/crm");
      const funnel = funnelSection(page);
      await expect(
        funnel.getByRole("heading", { name: "Pipeline funnel" }),
      ).toBeVisible();

      const overlaps = await funnel.evaluate((section) => {
        const labelled = [...section.querySelectorAll("text, li")];
        const boxes = labelled
          .map((el) => el.getBoundingClientRect())
          .filter((rect) => rect.width > 0 && rect.height > 0);
        const bad: string[] = [];
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i];
            const b = boxes[j];
            const xOverlap =
              Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const yOverlap =
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (xOverlap > 1 && yOverlap > 1) {
              bad.push(`label ${i} intersects label ${j}`);
            }
          }
        }
        return bad;
      });
      expect(overlaps, `funnel labels overlap at ${width}px`).toEqual([]);
    });
  }

  test("recent activities render separated items", async ({ page }) => {
    await login(page);
    await page.goto("/crm");
    const feed = activitySection(page);
    await expect(
      feed.getByRole("heading", { name: "Recent activity" }),
    ).toBeVisible();

    const items = await feed.locator("li").all();
    if (items.length === 0) {
      await expect(feed.getByText("No recent activity")).toBeVisible();
      return;
    }

    const check = await feed.evaluate((section) => {
      const rows = [...section.querySelectorAll("li")];
      return rows.map((li) => {
        const style = getComputedStyle(li);
        const rect = li.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          border: [
            style.borderTopWidth,
            style.borderRightWidth,
            style.borderBottomWidth,
            style.borderLeftWidth,
          ],
        };
      });
    });

    for (const [index, row] of check.entries()) {
      for (const side of row.border) {
        expect(side, `activity ${index} has no visible boundary`).not.toBe(
          "0px",
        );
      }
    }
    for (let i = 1; i < check.length; i++) {
      const gap = check[i].top - check[i - 1].bottom;
      expect(
        gap,
        `activities ${i - 1} and ${i} run together (gap ${gap}px)`,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  test("first visit renders light; toggle round-trips and persists across reload", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await login(page);
    await page.goto("/crm");

    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: "Toggle theme" });
    await expect(toggle).toBeVisible();

    await expect(html).toHaveAttribute("data-theme", "light");
    expect(await bodyBackground(page)).toBe(MIST);

    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    expect(await bodyBackground(page)).toBe(BASALT);

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    expect(await bodyBackground(page)).toBe(BASALT);
    expect(await page.evaluate(() => localStorage.getItem("atrium.theme"))).toBe(
      "dark",
    );

    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", "light");
    expect(await bodyBackground(page)).toBe(MIST);

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "light");
    expect(await bodyBackground(page)).toBe(MIST);
    expect(await page.evaluate(() => localStorage.getItem("atrium.theme"))).toBe(
      "light",
    );
  });

  test.describe("dark OS preference", () => {
    test.use({ colorScheme: "dark" });

    test("first visit is still light (OS setting is not auto-followed)", async ({
      page,
    }) => {
      await page.goto("/login");
      await page.evaluate(() => localStorage.clear());
      await login(page);
      await page.goto("/crm");

      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      expect(await bodyBackground(page)).toBe(MIST);
    });
  });
});
