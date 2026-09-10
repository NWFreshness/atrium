/**
 * Groove is a Web Audio instrument, so these tests are deliberately shallow: they prove the
 * sequencer runs and the controls respond, never that it sounds right. Audio quality is a
 * manual check.
 *
 * The playhead LED strip is the honest proxy for "the clock is running": it is driven by the
 * same transport that schedules the audio, without reaching into the audio graph.
 *
 * Ported from the reference `e2e/groove/instrument.spec.ts`, adapted for Atrium: the LED strip is
 * `.groove-leds` (spans `groove-led`, lit `groove-led-on`) inside `.groove-master-leds`.
 */
import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;

// Groove has no tenant data, so either account works. Prefer demo, fall back to owner.
const email = demoEmail ?? ownerEmail;
const password =
  demoEmail && demoPassword ? demoPassword : (ownerPassword ?? null);

test.beforeAll(() => {
  if (!email || !password) {
    throw new Error(
      "AUTH_DEMO_EMAIL/AUTH_DEMO_PASSWORD (or the owner pair) are required for e2e",
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

const UNITS = ["RHYTHM", "BASS", "PADS", "LEAD"];

/**
 * How many of a bar's 16 steps have to light before we accept that the sequencer ran.
 *
 * Not all 16. The engine's draw loop reports only the last step it finds queued each frame, so a
 * machine whose rAF drops below the step rate renders a bar with gaps in it. Twelve keeps a wide
 * margin on a slow laptop while still being impossible to reach without sweeping most of a bar.
 */
const MIN_STEPS_SEEN = 12;

/** Index of the lit step in the master LED strip, or -1 when the transport is stopped. */
function playhead(page: Page): Promise<number> {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll(".groove-master-leds .groove-led"),
    ).findIndex((el) => el.className.includes("on")),
  );
}

const transport = (page: Page) =>
  page.getByRole("button", { name: /(PLAY|STOP)/ });

/**
 * Accumulates every step the LED strip lights, from inside the page.
 *
 * Sampling the strip from the test cannot do this reliably. `expect.poll` settles at a 1s
 * interval, a step lasts ~134ms and a bar ~2.1s, so each poll advances ~7 steps and the samples
 * walk backwards through the bar in a comb, missing steps for an entire 10s window. A set that
 * only ever grows makes the poll interval irrelevant.
 */
async function recordSteps(page: Page) {
  await page.locator(".groove-master-leds").waitFor();
  await page.evaluate(() => {
    const strip = document.querySelector(".groove-master-leds");
    if (!strip) return;
    const seen = new Set<number>();
    window.stepsSeen = seen;
    const record = () => {
      const lit = Array.from(strip.querySelectorAll(".groove-led")).findIndex(
        (el) => el.className.includes("on"),
      );
      if (lit >= 0) seen.add(lit);
    };
    new MutationObserver(record).observe(strip, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });
}

const stepsSeen = (page: Page) =>
  page.evaluate(() => window.stepsSeen?.size ?? 0);

declare global {
  interface Window {
    /** Every step index the LED strip has lit since recordSteps() was installed. */
    stepsSeen?: Set<number>;
  }
}

// Headed runs play sound out loud: best-effort stop before each page is reused.
test.afterEach(async ({ page }) => {
  const btn = page.getByRole("button", { name: /STOP/ }).first();
  await btn.click({ timeout: 500 }).catch(() => {});
});

test("unauthenticated /groove redirects to login", async ({ page }) => {
  await page.goto("/groove");
  await expect(page).toHaveURL(/\/login/);
});

test("the instrument boots with all four units", async ({ page }) => {
  test.skip(!email || !password, "auth credentials are required");
  await login(page, email!, password!);
  await page.goto("/groove");
  for (const unit of UNITS) {
    await expect(page.getByRole("region", { name: unit })).toBeVisible();
  }
  await expect(transport(page)).toContainText("PLAY");
});

test("the transport starts and stops, and the playhead follows it", async ({
  page,
}) => {
  test.skip(!email || !password, "auth credentials are required");
  await login(page, email!, password!);
  await page.goto("/groove");
  await expect(transport(page)).toContainText("PLAY");
  expect(await playhead(page)).toBe(-1);

  await transport(page).click();
  await expect(transport(page)).toContainText("STOP");

  // The clock is running if a step lights at all, then moves on.
  await expect
    .poll(() => playhead(page), { timeout: 5000 })
    .toBeGreaterThanOrEqual(0);
  const first = await playhead(page);
  await expect.poll(() => playhead(page), { timeout: 5000 }).not.toBe(first);

  await transport(page).click();
  await expect(transport(page)).toContainText("PLAY");
  await expect.poll(() => playhead(page), { timeout: 3000 }).toBe(-1);
});

test("drum steps are individually addressable and toggle through their states", async ({
  page,
}) => {
  test.skip(!email || !password, "auth credentials are required");
  await login(page, email!, password!);
  await page.goto("/groove");
  const step = page.getByRole("button", { name: "KICK step 3", exact: true });
  await expect(step).toBeVisible();

  const before = await step.getAttribute("aria-pressed");
  await step.click();
  await expect(step).not.toHaveAttribute("aria-pressed", before!);
});

test("melodic steps carry their unit name so the four grids stay distinguishable", async ({
  page,
}) => {
  test.skip(!email || !password, "auth credentials are required");
  await login(page, email!, password!);
  await page.goto("/groove");
  for (const unit of ["BASS", "PADS", "LEAD"]) {
    await expect(
      page.getByRole("button", { name: `${unit} step 1`, exact: true }),
    ).toHaveCount(1);
  }
});

test("switching patches changes the tempo", async ({ page }) => {
  test.skip(!email || !password, "auth credentials are required");
  await login(page, email!, password!);
  await page.goto("/groove");
  const bpm = () =>
    // Bounded rather than `\d+`: a tempo is at most four digits, and an unbounded quantifier
    // scanning the whole document backtracks badly.
    page.evaluate(
      () => /(\d{1,4})BPM/.exec(document.body.textContent ?? "")?.[1],
    );

  const first = await bpm();
  await page.getByRole("button", { name: /BASALT/ }).click();
  await expect.poll(bpm, { timeout: 3000 }).not.toBe(first);
});

test("a unit can be muted and unmuted", async ({ page }) => {
  test.skip(!email || !password, "auth credentials are required");
  await login(page, email!, password!);
  await page.goto("/groove");
  const rhythm = page.getByRole("region", { name: "RHYTHM" });
  await rhythm.getByRole("button", { name: "MUTE" }).click();
  await expect(rhythm).toHaveClass(/muted/);
  await rhythm.getByRole("button", { name: "MUTE" }).click();
  await expect(rhythm).not.toHaveClass(/muted/);
});

test("running the sequencer lights most of a bar and logs no console errors", async ({
  page,
}) => {
  test.skip(!email || !password, "auth credentials are required");
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await login(page, email!, password!);
  await page.goto("/groove");
  await recordSteps(page);
  await transport(page).click();
  // Most of a bar has to light. The playhead is driven by the same transport that schedules the
  // audio, so a swept bar proves the sequencer really ran.
  await expect
    .poll(() => stepsSeen(page), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(MIN_STEPS_SEEN);
  await transport(page).click();

  expect(errors).toEqual([]);
});
