/**
 * Phase 11.1 — the CRM pipeline in a browser.
 *
 * Three journeys, and two of them exist for one reason: **the pipeline board
 * rebases optimistically.** `onDragEnd` (`components/crm/pipeline-board.tsx:77-86`)
 * moves the card in local state, *then* awaits `moveDealAction`, then
 * `router.refresh()`. A test that never reloads therefore proves nothing — it
 * passes with the server action stubbed out to `return null`. So both drag
 * journeys assert the moved deal *after* `page.reload()`, and both read the
 * probability after the reload too, so the number comes from the server rather
 * than from the optimistic rebase.
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
 * `waitForURL` does not survive the credentials round trip
 * (`/api/auth/callback/credentials` sits between the click and the landing),
 * while `toHaveURL` retries and passes.
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
 * `e2e/workroom.spec.ts:211` and is applied to every assertion that follows a
 * navigation or a server action.
 */
const NAV_TIMEOUT = { timeout: 20_000 };

/**
 * The 30 s Playwright default is the **whole test's** budget, not one
 * assertion's, and these journeys mint a deal, walk to the board, drag, reload,
 * re-assert, cross-check a second surface, and clean up. Same reasoning as
 * `e2e/workroom.spec.ts:212`.
 */
const JOURNEY_TIMEOUT = 60_000;

const STAGES = [
  "New",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
] as const;

/**
 * The truth table from `lib/crm/seed.ts:126-173`. Asserted **scoped to the
 * column**, so a seeded deal that renders in the wrong column fails instead of
 * passing on being present somewhere else on the board.
 */
const SEEDED_DEALS: readonly { name: string; stage: string }[] = [
  { name: "Northwind fleet tracking", stage: "Won" },
  { name: "Northwind warehouse rollout", stage: "Negotiation" },
  { name: "Bluepeak platform license", stage: "Proposal" },
  { name: "Bluepeak onboarding workshop", stage: "Lost" },
  { name: "Harbor & Lane advisory retainer", stage: "Qualified" },
  { name: "Harbor & Lane intake", stage: "New" },
];

/** A stage column is a `<section>` headed by an `<h2>` with the stage name. */
function column(page: Page, stage: string) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: stage, exact: true, level: 2 }),
  });
}

/**
 * The scrollable list **inside** a column — and this is the element the drag has
 * to aim at, not the `<section>`. `data-rfd-droppable-id` is a library attribute
 * rather than Atrium's, and it is used here for one measured reason: the
 * section's top 84 px is its `<header>` (stage name plus totals), so dropping at
 * `section.y + 30` lands on the `<h2>` — measured here as
 * `elementFromPoint` → `H2 "Qualified"`, with the droppable list starting 87 px
 * lower. The drag still resolves to the right column today only because
 * `@hello-pangea/dnd` falls back to closest-by-centre across all droppables when
 * the pointer is over none of them, so the test would pass for a reason the code
 * does not encode and would break the moment a header grew. The CSS-module
 * classes are hashed and the list has no accessible name, so this attribute is
 * the only stable handle on the actual drop target.
 */
function dropList(page: Page, stage: string) {
  return column(page, stage).locator("[data-rfd-droppable-id]");
}

/** A deal card is an `<article>`; the name link inside it is the exact match. */
function card(page: Page, name: string) {
  return page
    .locator("article")
    .filter({ has: page.getByText(name, { exact: true }) });
}

/**
 * The name the *currently running* test minted, so `afterEach` can delete it.
 * This is a cleanup target, not a fixture: it holds no tenant state and is
 * cleared by the very cleanup that reads it.
 *
 * Every minted name carries `crypto.randomUUID()` and not just `Date.now()`:
 * cleanup deletes **by name**, so a collision would have one run's `afterEach`
 * delete another run's row — and the loser's closing `toHaveCount(0)` would
 * then pass while asserting nothing about its own deal. `Date.now()` alone is
 * only unique within a process; two concurrent runs, or a run and a developer's
 * own suite, reach the same millisecond easily.
 */
let minted: string | null = null;

/** A function, not a Playwright fixture: takes a name, returns nothing. */
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
 * and the test is red — a test must not report green over a leak. Deals carry
 * their own activities away with them via `onDelete: "set null"`, which orphans
 * rather than deletes — `crm-activities.spec.ts` is the file that records what
 * that leaves behind.
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

test("the board renders six columns with each seeded deal in its seeded stage", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(JOURNEY_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  await page.goto("/crm/pipeline");
  await expect(
    page.getByRole("heading", { name: "Pipeline", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  for (const stage of STAGES) {
    await expect(column(page, stage)).toBeVisible(NAV_TIMEOUT);
  }
  for (const { name, stage } of SEEDED_DEALS) {
    await expect(
      column(page, stage).getByText(name, { exact: true }),
    ).toBeVisible(NAV_TIMEOUT);
  }
  // Presence only. The header totals depend on every row in a tenant that
  // accumulates across runs and retries, so their values are not asserted here;
  // `lib/crm/pipeline-metrics.test.ts` covers the arithmetic.
  await expect(page.getByText("Open pipeline", { exact: true })).toBeVisible(
    NAV_TIMEOUT,
  );
  await expect(page.getByText("Expected", { exact: true })).toBeVisible(
    NAV_TIMEOUT,
  );
});

test("a mouse drag moves a deal New → Qualified and survives a reload", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(JOURNEY_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  // Minted inside the test body, never in a fixture: CI runs with `retries: 1`,
  // and a shared fixture plus a retry means the retry lands on rows the first
  // attempt created.
  const name = `E2E Drag ${Date.now()} ${crypto.randomUUID()}`;
  minted = name;
  await createDeal(page, name);

  await page.goto("/crm/pipeline");
  await expect(
    page.getByRole("heading", { name: "Pipeline", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  const dragCard = card(page, name);
  await expect(dragCard).toBeVisible(NAV_TIMEOUT);
  await expect(
    column(page, "New").getByText(name, { exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  // A new deal defaults to New/10%, so this is what makes the `25%` assertion
  // below a rebase rather than a coincidence.
  await expect(dragCard).toContainText("10%", { timeout: NAV_TIMEOUT.timeout });

  // A column's list is a scroll container (`max-height: calc(100vh - 14rem)`,
  // `overflow-y: auto`) and this card is appended at the end of it, so bring it
  // into view before measuring — a bounding box outside the clip would point the
  // mouse at whatever is painted there instead.
  await dragCard.scrollIntoViewIfNeeded();

  // Drag for real. A `.click()` on a card does nothing and neither does
  // `dragTo()`; `@hello-pangea/dnd`'s mouse sensor lifts only once the pointer
  // has travelled past a 5 px threshold and the drag is raf-throttled, so a
  // single jump to the target does not lift the card. The incremental moves with
  // real time between them are load-bearing — do not collapse this into one
  // `mouse.move`.
  const src = await dragCard.boundingBox();
  // Aimed at the droppable list, not the section — see `dropList`. The drop
  // point is 30 px into the list, which is inside it by construction whatever
  // the column header happens to measure.
  const dst = await dropList(page, "Qualified").boundingBox();
  if (!src || !dst) {
    throw new Error("pipeline: missing bounding box");
  }
  const from = { x: src.x + src.width / 2, y: src.y + src.height / 2 };
  const to = { x: dst.x + dst.width / 2, y: dst.y + 30 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(60);
  for (let s = 1; s <= 8; s += 1) {
    const t = s / 8;
    await page.mouse.move(
      from.x + (to.x - from.x) * t,
      from.y + (to.y - from.y) * t,
    );
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(150);

  // `onDragEnd` is async: optimistic rebase, then `await moveDealAction`, then
  // `router.refresh()`. Polling the column alone is **not** enough, because the
  // optimistic rebase has already satisfied it — reloading at that point aborts
  // the in-flight action POST and the move is lost. So wait for the action
  // response to land, then poll, then reload.
  const persisted = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/crm/pipeline"),
    { timeout: 30_000 },
  );
  await page.mouse.up();
  await persisted;

  await expect
    .poll(
      async () =>
        (await column(page, "Qualified")
          .getByText(name, { exact: true })
          .count()) > 0,
      { timeout: 15_000 },
    )
    .toBe(true);

  // The reload is the assertion that makes this feature worth writing: the
  // optimistic rebase has already moved the card, so without it this test
  // passes even if `moveDealAction` throws.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pipeline", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await expect(
    column(page, "Qualified").getByText(name, { exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await expect(
    column(page, "New").getByText(name, { exact: true }),
  ).toHaveCount(0, NAV_TIMEOUT);
  // Deliberate substring match — the card's meta line is
  // `${value} · ${expected} expected · ${probability}%`, so asserting the whole
  // string would break on a `formatMoney` change. The contract is
  // `STAGE_PROBABILITY.Qualified === 25`, and this is read *after* the reload,
  // so it is the server's value rather than the optimistic one.
  //
  // **Two rebases produce this number, not one.** `move-deal.ts:60` passes
  // `probability` in its `updateDeal` call, but `updateDealInDrizzle` also
  // computes it (`queries-drizzle.ts:327` → `nextProbabilityOnStageChange`), so
  // either alone rebases and they mask each other. Measured: commenting out
  // `move-deal.ts:60` alone left both drag tests **green**; removing both made
  // them red here with `10%` received. Do not read a green run of this assertion
  // as proof that the `move-deal.ts:60` rebase is covered — the probe that shows
  // it is covered has to break both.
  await expect(card(page, name)).toContainText("25%", {
    timeout: NAV_TIMEOUT.timeout,
  });

  // 1.6's acceptance criterion 3 — a second surface reads the same row. This is
  // the first time it has been checked in a browser.
  await page.goto("/crm/deals");
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible(NAV_TIMEOUT);
  await expect(row).toContainText("Qualified", {
    timeout: NAV_TIMEOUT.timeout,
  });
});

test("a keyboard drag moves a deal New → Qualified and survives a reload", async ({
  page,
}) => {
  test.skip(
    !demoEmail || !demoPassword,
    "AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD are required",
  );
  test.setTimeout(JOURNEY_TIMEOUT);
  await login(page, demoEmail!, demoPassword!);

  const name = `E2E Keyboard ${Date.now()} ${crypto.randomUUID()}`;
  minted = name;
  await createDeal(page, name);

  await page.goto("/crm/pipeline");
  await expect(
    page.getByRole("heading", { name: "Pipeline", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  const dragCard = card(page, name);
  await expect(dragCard).toBeVisible(NAV_TIMEOUT);
  await expect(
    column(page, "New").getByText(name, { exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await expect(dragCard).toContainText("10%", { timeout: NAV_TIMEOUT.timeout });

  /**
   * `scrollIntoViewIfNeeded()` before `focus()` is **not** optional and it is
   * not noise: `locator.focus()` does not scroll. Measured, the target card
   * sat at `top: 639` in a 720 px viewport, straddling the fold, and the
   * keyboard drag failed **0 of 3** at 300 ms between keys and **0 of 3** at
   * 800 ms without this line — and succeeded **10 of 10** with it (5 of 5 at
   * 1280×720 and 5 of 5 at 1280×1200). The next implementer will otherwise
   * delete the "redundant" scroll and inherit a flaky suite.
   */
  await dragCard.scrollIntoViewIfNeeded();
  await dragCard.focus();
  await expect(dragCard).toBeFocused();

  // The settle between keys is the library's own live region, not a sleep:
  // polling the announcement is the honest synchronisation, and it is also the
  // accessibility assertion that earns this journey its place next to the mouse
  // one — it drives the keyboard sensor and the screen-reader contract, a
  // different code path from the pointer.
  await page.keyboard.press("Space");
  await expect
    .poll(() => announcement(page), { timeout: 10_000 })
    .toContain("You have lifted an item");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => announcement(page), { timeout: 10_000 })
    .toContain("You have moved the item");
  // Same reason as the mouse journey: the optimistic rebase has already moved
  // the card, so wait for the action POST before reloading or the move is lost.
  // Registered **before** the drop keypress, or the POST can start first and the
  // waiter would never see it.
  const persisted = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/crm/pipeline"),
    { timeout: 30_000 },
  );
  await page.keyboard.press("Space");
  await persisted;

  await expect
    .poll(
      async () =>
        (await column(page, "Qualified")
          .getByText(name, { exact: true })
          .count()) > 0,
      { timeout: 15_000 },
    )
    .toBe(true);

  // Same rule as the mouse journey: the persisted column and the persisted
  // probability are what is being asserted, and the `25%` needs the same
  // two-rebase caveat documented there.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pipeline", level: 1, exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await expect(
    column(page, "Qualified").getByText(name, { exact: true }),
  ).toBeVisible(NAV_TIMEOUT);
  await expect(
    column(page, "New").getByText(name, { exact: true }),
  ).toHaveCount(0, NAV_TIMEOUT);
  await expect(card(page, name)).toContainText("25%", {
    timeout: NAV_TIMEOUT.timeout,
  });
});

/**
 * The live region `@hello-pangea/dnd` appends to `<body>` while a drag is
 * active (`aria-live="assertive"`, `aria-atomic="true"`, visually hidden). It
 * is the library's markup, not Atrium's, so a library upgrade can break this
 * journey for a reason that has nothing to do with the CRM — an acceptable,
 * visible failure, and a recorded coupling.
 *
 * Scoped to `#rfd-announcement-` rather than a bare `[aria-live]`: Next mounts
 * its own assertive route announcer (`#__next-route-announcer__`, inside a
 * shadow root) on authenticated routes, and Playwright's locators pierce shadow
 * DOM, so a bare `[aria-live]` matches **two** nodes here and `.first()` would
 * return whichever comes first in document order. `textContent` rather than
 * `innerText` because the element is visually hidden.
 */
function announcement(page: Page) {
  return page.locator("[id^='rfd-announcement-']").textContent();
}
