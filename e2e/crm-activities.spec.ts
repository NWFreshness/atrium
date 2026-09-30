/**
 * Phase 11.1 — CRM activities in a browser.
 *
 * The deal detail page renders `<ActivityForm dealId={id} />` and an
 * `<ActivityTimeline>` of one `<li>` per activity
 * (`app/(authenticated)/crm/deals/[id]/page.tsx:73-75`). Both writes are
 * client-then-server — `createActivityAction` → `router.refresh()` and
 * `toggleActivityDoneAction` → `router.refresh()` — so like the pipeline
 * journeys these assert **persisted state after a reload**. A toggle that
 * reverts, or an activity that never reached the database, is invisible to a
 * test that only looks at the DOM once.
 */
import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.AUTH_OWNER_EMAIL;
const ownerPassword = process.env.AUTH_OWNER_PASSWORD;
const demoEmail = process.env.AUTH_DEMO_EMAIL;
const demoPassword = process.env.AUTH_DEMO_PASSWORD;

/**
 * Throws without the owner pair even though every test here is demo-only and
 * never reads the owner credentials. That is deliberate and is spec criterion
 * 16: the whole CRM e2e suite is gated on the six-secret contract in
 * `.github/workflows/ci.yml`, and a demo-only file that ran without the owner
 * pair would report green in a half-configured environment where the CRM surface
 * was only half exercised. Do not "clean this up" into a demo-only guard.
 */
test.beforeAll(() => {
  if (!ownerEmail || !ownerPassword) {
    throw new Error(
      "AUTH_OWNER_EMAIL and AUTH_OWNER_PASSWORD are required for e2e",
    );
  }
});

/**
 * Copied verbatim from `e2e/crm.spec.ts:22-28`, including the `toHaveURL` —
 * `waitForURL` does not survive the credentials round trip, while `toHaveURL`
 * retries and passes.
 */
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

/**
 * A dev-server action against a loaded database takes seconds on a cold route,
 * so the 5 s default per-assertion timeout times these journeys out. Mirrors
 * `e2e/workroom.spec.ts:211`.
 */
const NAV_TIMEOUT = { timeout: 20_000 };

/**
 * The 30 s Playwright default is the **whole test's** budget, not one
 * assertion's, and each of these walks three screens and round-trips two server
 * actions. Mirrors `e2e/workroom.spec.ts:212`.
 */
const JOURNEY_TIMEOUT = 60_000;

/**
 * The name the running test minted. A cleanup target, not a fixture: it holds no
 * tenant state, and the very cleanup that reads it clears it. A Playwright
 * fixture would be the wrong shape — 11.2 owns the shared journey helper, and
 * the rule for that file is a plain function taking a `name`, not an object
 * imported and mutated by every spec.
 *
 * Every minted name carries `crypto.randomUUID()` and not just `Date.now()`,
 * because cleanup deletes **by name**: a collision would have one run's
 * `afterEach` delete another run's deal, and the loser would then pass its
 * closing `toHaveCount(0)` without having asserted anything about its own row.
 */
let minted: string | null = null;

/** A function, not a fixture: takes a name, returns nothing. */
async function createDeal(page: Page, name: string) {
  await page.goto("/crm/deals");
  await expect(
    page.getByRole("heading", { name: "Deals", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await page.getByRole("button", { name: "Add deal", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add deal" });
  await expect(dialog).toBeVisible(NAV_TIMEOUT);
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByLabel("Value", { exact: true }).fill("1000");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden(NAV_TIMEOUT);
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible(
    NAV_TIMEOUT,
  );
}

/**
 * Cleanup is best-effort but **verified**: the loop re-reads the button list on
 * every pass, because a loop that only ever looks at `.first()` deletes one row
 * and silently leaves the rest. If the row survives, the final assertion throws
 * and the test is red — a test must not report green over a leak.
 *
 * **What this cannot clean up, and why that matters:** deleting a deal only
 * sets `activities.dealId` to NULL (`lib/crm/schema.ts:103`, `onDelete:
 * "set null"`), and the product has no activity-delete affordance at all — 11.3
 * adds it. So every activity these journeys create is orphaned by this cleanup
 * and stays in the tenant, and `/crm`'s "Recent activity" feed lists
 * tenant-wide activities regardless of linkage, so the orphans become the
 * newest rows on the demo dashboard. Measured: after one run, 8 of the top 8
 * feed entries were E2E orphans. The demo tenant therefore needs a Reset demo
 * (or a manual purge) after runs of this file. 11.3 is the feature that makes
 * this suite's cleanup total.
 */
async function deleteMintedDeal(page: Page, name: string) {
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/crm/deals");
  for (let pass = 0; pass < 5; pass += 1) {
    const remove = page.getByRole("button", {
      name: `Delete ${name}`,
      exact: true,
    });
    if ((await remove.count()) === 0) {
      break;
    }
    await remove.first().click();
    await expect(remove).toHaveCount(0, NAV_TIMEOUT);
  }
  await expect(page.getByRole("link", { name, exact: true })).toHaveCount(
    0,
    NAV_TIMEOUT,
  );
}

test.afterEach(async ({ page }) => {
  const name = minted;
  minted = null;
  if (name) {
    await deleteMintedDeal(page, name);
  }
});

/**
 * The activity timeline's `<li>`s. Scoped to `main` rather than to the `<ul>`:
 * the page renders no timeline at all until an activity exists (measured: a
 * deal with no activities has zero `main ul` and ten `li` under the nav), so a
 * "the only `<ul>` on this page" comment would be a claim the page contradicts
 * even while the test passes. `main` is the page body and excludes the nav.
 */
function timelineItems(page: Page) {
  return page.locator("main ul li");
}

test("an activity created on a deal appears newest-first and survives a reload", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(JOURNEY_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  // Minted inside the test body: CI runs with `retries: 1`, and a shared fixture
  // plus a retry means the retry lands on rows the first attempt created.
  const name = `E2E Activity Deal ${Date.now()} ${crypto.randomUUID()}`;
  minted = name;
  await createDeal(page, name);

  await page.getByRole("link", { name, exact: true }).click();
  await expect(
    page.getByRole("heading", { name, level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await expect(
    page.getByRole("heading", { name: "Activities", level: 2, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);

  // Two activities, so the ordering claim is a real relative claim rather than
  // "the only row is first". Both default to `occurredAt = new Date()`
  // (`lib/crm/activity-actions.ts:103-105`), and the timeline orders by
  // `occurredAt DESC NULLS LAST, createdAt DESC, id`
  // (`lib/crm/queries-drizzle.ts:375-379`), so the one written last leads.
  const older = `E2E activity older ${Date.now()}`;
  const newer = `E2E activity newer ${Date.now()}`;
  const description = page.getByLabel("Description", { exact: true });
  for (const text of [older, newer]) {
    await page.getByLabel("Type", { exact: true }).selectOption("call");
    await description.fill(text);
    await page
      .getByRole("button", { name: "Add activity", exact: true })
      .click();
    // Wait for the write **and** the post-action reset. `ActivityForm` clears
    // `description` in the same `finally` block that awaited the action
    // (`components/crm/activity-form.tsx:37-54`), and React's reset can land on
    // top of the next fill — the field goes back to empty, `required` then
    // blocks the submit, and no request is ever made. Filling before the reset
    // lands makes a real journey look like a silent no-op.
    await expect(page.getByText(text, { exact: true })).toBeVisible(
      NAV_TIMEOUT,
    );
    await expect(description).toHaveValue("", NAV_TIMEOUT);
  }

  await expect
    .poll(async () => (await timelineItems(page).first().innerText()) || "", {
      timeout: 15_000,
    })
    .toContain(newer);

  // The reload is the persistence proof: `createActivityAction` then
  // `router.refresh()` (`components/crm/activity-form.tsx:39-51`), so a test that
  // never reloads would pass even if the action threw.
  await page.reload();
  await expect(page.getByText(newer, { exact: true })).toBeVisible(NAV_TIMEOUT);
  await expect(page.getByText(older, { exact: true })).toBeVisible(NAV_TIMEOUT);
  await expect(timelineItems(page).first()).toContainText(newer);
});

test("the done checkbox's accessible name flips and survives a reload", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(JOURNEY_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  const name = `E2E Toggle Deal ${Date.now()} ${crypto.randomUUID()}`;
  minted = name;
  await createDeal(page, name);

  await page.getByRole("link", { name, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: name, level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);

  const activity = `E2E toggle activity ${Date.now()}`;
  await page.getByLabel("Type", { exact: true }).selectOption("email");
  await page.getByLabel("Description", { exact: true }).fill(activity);
  await page.getByRole("button", { name: "Add activity", exact: true }).click();
  await expect(page.getByText(activity, { exact: true })).toBeVisible(
    NAV_TIMEOUT,
  );

  // The accessible name is derived from `done`
  // (`components/crm/activity-timeline.tsx:75-79`), so a flip is an assertion
  // about persisted state rather than about markup: it can only render
  // `not done` if the server returned `done: true`. `exact: true` because the
  // name is built from a `Date.now()` fixture and is a substring-shaped string.
  const undone = page.getByRole("checkbox", {
    name: `Mark ${activity} done`,
    exact: true,
  });
  const done = page.getByRole("checkbox", {
    name: `Mark ${activity} not done`,
    exact: true,
  });
  await expect(undone).toHaveCount(1, NAV_TIMEOUT);
  await expect(undone).not.toBeChecked({ timeout: NAV_TIMEOUT.timeout });
  // Deliberately `click()` and **not** `check()`. The checkbox is a controlled
  // input whose `checked` comes from the server render
  // (`components/crm/activity-timeline.tsx:71-79`), so it is still `false` when
  // the click lands; nothing flips it client-side. `check()` therefore re-reads
  // the state, sees it unchanged, and fails with "Clicking the checkbox did not
  // change its state" on a write that did happen. The observable proof of the
  // write is the accessible-name flip below, which is what the journey is for.
  await undone.click();
  // The name flip can only render after `toggleActivityDoneAction` returned and
  // `router.refresh()` re-rendered, so waiting for the visible flipped name
  // already implies the write landed. The reload follows.
  await expect(done).toBeVisible(NAV_TIMEOUT);

  await page.reload();
  await expect(done).toBeChecked(NAV_TIMEOUT);
});
