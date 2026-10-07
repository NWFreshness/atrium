/**
 * 13.1 professional UI refresh — layout + interaction pass (JOB-006).
 *
 * AC3: no horizontal scroll and no broken layout at 375 / 768 / 1024 / 1440
 * on the four app landing surfaces (/crm, /space, /rolodex, /groove) plus the
 * launcher and login.
 * AC4: every button, link, input, and nav item on the refreshed surfaces
 * shows a visible :hover and :focus-visible state, and motion honors
 * prefers-reduced-motion.
 *
 * The unauthenticated section (login) always runs. The authenticated section
 * skips without an auth pair, following the e2e/workroom.spec.ts pattern.
 */
import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [375, 768, 1024, 1440] as const;

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;

// The seeded demo tenant is what makes the app walks meaningful; fall back to
// owner so the chrome gates still run without the demo pair.
const email = demoEmail ?? ownerEmail;
const password =
  demoEmail && demoPassword ? demoPassword : (ownerPassword ?? null);

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(
    overflow.scroll,
    `horizontal scroll: scrollWidth ${overflow.scroll} > viewport ${overflow.inner}`,
  ).toBeLessThanOrEqual(overflow.inner + 1);
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("unauthenticated login surface", () => {
  for (const width of WIDTHS) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      await expect(page.locator("main")).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }

  test("sign-in button shows a visible hover state", async ({ page }) => {
    await page.goto("/login");
    const button = page.getByRole("button", { name: "Sign in" });
    await expect(button).toBeVisible();
    const before = await button.evaluate(
      (el) => getComputedStyle(el).filter,
    );
    await button.hover();
    const after = await button.evaluate((el) => getComputedStyle(el).filter);
    // .atrium-btn-primary:hover applies filter: brightness(1.06) instantly
    // (filter is not on the transition list), so the computed value flips.
    expect(before, "button already filtered before hover").toBe("none");
    expect(after, "button hover shows no visible change").not.toBe("none");
  });

  test("inputs and button show a visible focus-visible ring", async ({
    page,
  }) => {
    await page.goto("/login");
    const emailInput = page.getByLabel("Email");
    await emailInput.click();
    const inputOutline = await emailInput.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    // Text inputs match :focus-visible on focus; the shared chrome paints the
    // --focus-ring outline (2px solid brass).
    expect(inputOutline, "email input shows no focus ring").toBe("solid");

    // Keyboard into the Sign in button: buttons only match :focus-visible
    // for keyboard focus, so Tab there from the password field.
    await page.getByLabel("Password").click();
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused, "Tab did not reach the Sign in button").toHaveText(
      /sign in/i,
    );
    const buttonOutline = await focused.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(buttonOutline, "button shows no keyboard focus ring").toBe("solid");
  });

  test("prefers-reduced-motion stops the stagger and the sky drift", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/login");
    const reveal = page.locator(".reveal").first();
    await expect(reveal).toBeVisible();
    const motion = await page.evaluate(() => {
      const card = document.querySelector(".reveal");
      const after = getComputedStyle(document.body, "::after");
      return {
        reveal: card ? getComputedStyle(card).animationName : "",
        sky: after.animationName,
      };
    });
    expect(motion.reveal).toBe("none");
    expect(motion.sky).toBe("none");
  });
});

test.describe("authenticated landing surfaces", () => {
  test.skip(
    !email || !password,
    "AUTH_DEMO_EMAIL/AUTH_DEMO_PASSWORD (or the owner pair) are required for e2e",
  );

  // Launcher + the four app landing surfaces. /space redirects to its first
  // page when the tenant has one, so the walk tolerates either URL.
  const surfaces = ["/", "/crm", "/space", "/rolodex", "/groove"];

  for (const width of WIDTHS) {
    test(`no horizontal scroll at ${width}px on every surface`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await login(page);
      for (const surface of surfaces) {
        await page.goto(surface);
        // Groove nests a second <main> inside the page landmark.
        await expect(
          page.locator("main").first(),
          `${surface} has no visible main at ${width}px`,
        ).toBeVisible();
        const overflow = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          inner: window.innerWidth,
        }));
        expect(
          overflow.scroll,
          `${surface} scrolls sideways at ${width}px: scrollWidth ${overflow.scroll} > viewport ${overflow.inner}`,
        ).toBeLessThanOrEqual(overflow.inner + 1);
      }
    });
  }

  test("top nav wraps instead of scrolling at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await login(page);
    const nav = page.locator("nav[aria-label='Atrium']");
    await expect(nav).toBeVisible();
    const wrap = await nav.evaluate((el) => getComputedStyle(el).flexWrap);
    expect(wrap, "nav strip does not wrap at 375px").toBe("wrap");
  });

  test("launcher cards collapse without squeezing at 375px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await login(page);
    const columns = await page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector(".atrium-graph")!,
        ).gridTemplateColumns.split(" ").length,
    );
    expect(columns, "launcher graph is not single-column at 375px").toBe(1);
    for (const label of ["CRM", "Space", "Rolodex", "Groove"]) {
      await expect(
        page.locator(".atrium-graph").getByRole("link", { name: label }),
        `${label} card not visible at 375px`,
      ).toBeVisible();
    }
  });

  test("shared buttons and subnav tabs show keyboard focus rings", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/crm");
    // First shared control reachable by keyboard gets the --focus-ring
    // outline; assert on whatever it is rather than a fixed tab order.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? getComputedStyle(el).outlineStyle : "none";
    });
    expect(outline, "no visible keyboard focus in the shared chrome").not.toBe(
      "none",
    );
    const subnav = page.locator(".atrium-subnav").first();
    if (await subnav.isVisible()) {
      const wrap = await subnav.evaluate(
        (el) => getComputedStyle(el).flexWrap,
      );
      expect(wrap, "subnav does not wrap at narrow widths").toBe("wrap");
    }
  });
});
