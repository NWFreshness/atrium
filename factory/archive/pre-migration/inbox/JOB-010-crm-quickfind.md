# JOB-010 — CRM QuickFind (⌘/Ctrl+K, 11.10)

## Goal

A signed-in CRM user can type a fragment of anything — a person, a company, a
deal, a note they logged — and jump to it from any CRM section with one
`⌘` / `Ctrl+K`. Four buckets: Organizations, Contacts, Deals, Activities.
Each capped at 5 hits with the total match count carried separately. Closes
**G16**. Copies Space 2.7's interaction (`components/space/quick-find.tsx` +
`lib/space/search.ts`), not its module.

## Scope paths

```
lib/crm/search.ts                                   # new — pure searchCrm(tenantId, q, repo?); value imports queries.ts + format.ts; type-only queries-shared
lib/crm/search.test.ts                              # new — tenant scoping, caps, ordering, empty query, unlinked exclusion
lib/crm/search-actions.ts                           # new — searchCrmForSession + searchCrmAction (use server)
lib/crm/search-actions.test.ts                      # new — session tenant wins over a client tenantId; unauthenticated throws
components/crm/quick-find.tsx                       # new — client palette; useId() for ids
components/crm/quick-find.module.css                # new — crm- prefixed classes only
components/crm/quick-find.test.ts                   # new — narrow source gate
components/crm/crm-subnav.tsx                       # trigger sibling of <ul>, inside <nav>, not as <li>
components/crm/crm-subnav.module.css                # margin-left: auto wrapper
app/(authenticated)/crm/layout.tsx                  # render <CrmQuickFind /> beside <CrmSubnav /> inside .crm-shell
e2e/crm-quickfind.spec.ts                           # new — opens from every section, grouped, navigates, activity href, no matches, Escape, ⌘K over form ignored, owner isolation
```

Branch convention: ship on `feat/11.10-crm-quickfind`. Never commit or push
to `main`. Never merge unless the user asks.

## Out of scope

- **A `cmd`-palette for the whole Atrium app.** Space already binds ⌘/Ctrl-K
  in its own mount; this card mounts only in the CRM layout. The two are
  never mounted at once.
- **Search inside activity descriptions' full text beyond substring match.**
- **Bounded lists or pagination on the list helpers.** 11.10 caps **its own**
  results per bucket; the underlying `listX` stay unbounded.
- **Any change to the three `?q=` page filters.** They keep working exactly
  as they are.
- **Changing the pipeline board, the dashboard, or the tables** — those are
  11.4 / 11.8's surface.
- **A second modifier.** `Meta` **or** `Control`, never both required.
- **A "recent" or "frequently visited" mode.** An empty query shows
  `Type to search`, as Space does.
- **Overflow `See all …` rows.** Cut by the spec — see Recorded limits.
- **Replacing, editing or refactoring the three existing record forms'
  `titleId` constants.** 11.5 owns the Escape/focus work on those forms.
- **Any client value-import of `lib/crm/queries.ts`, `schema.ts`, `lib/db`,
  `drizzle-orm`, or `@neondatabase/serverless`.** Type-only imports of the
  barrel are the contract; `client-boundary.test.ts` is the gate.
- **Editing `lib/crm/format.ts`.**
- **A `?quickfind=` URL param.**

## Acceptance criteria

1. `lib/crm/search.ts` exports `searchCrm(tenantId, q, repo?)` returning
   `CrmSearchResults` with four arrays, a `totals` record, and
   `CRM_SEARCH_LIMIT = 5`.
2. `searchCrm` throws on a missing or whitespace `tenantId` via
   `requireTenantId`.
3. A row in tenant-b named `Ana Ruiz` is never in
   `searchCrm("tenant-a", "ana", memory)`'s contacts; a tenant-a row with
   the same name is. Asserted by returned ids, not by `repo.contacts.length`.
4. A blank or whitespace-only `q` returns four empty arrays and four zero
   totals.
5. Seven matching organizations return `organizations.length === 5` **and**
   `totals.organization === 7`.
6. An activity with `contactId: null && dealId: null` is absent from
   `activities` **and** absent from `totals.activity`. With a `dealId`, href
   is `/crm/deals/<dealId>`; with only a `contactId`, href is
   `/crm/contacts/<contactId>`. Both parent-precedence cases asserted.
7. Within a bucket, hits sort by `label` then `id`.
8. `searchCrmForSession` throws `"Unauthenticated"` for a null session.
9. The returned hits contain only rows from the **session's** tenant. The
   action's public signature accepts no object, so no `tenantId` field can
   be smuggled.
10. **`lib/client-boundary.test.ts` stays green, and the injection probe
    passes**: changing the type-only import to a value import fails the gate
    naming this file.
11. `tests/workroom-namespace.test.ts` green — `quick-find.module.css`
    imported only from `components/crm/**`.
12. `quick-find.module.css` declares every class used via `styles[...]` in
    the `.tsx`; every class name starts with `crm-`.
13. `quick-find.tsx` uses `useId()` for the dialog title id, the listbox id,
    the status id, the group heading ids and the option ids.
14. The dialog is `role="dialog" aria-modal="true"` and is labelled; the
    input carries `role="combobox"`, `aria-expanded="true"`, `aria-controls`,
    `aria-autocomplete="list"`, `aria-describedby`.
15. **`aria-activedescendant` is present exactly when an option is active,
    and absent otherwise** — asserted in the e2e.
16. `role="listbox"`'s direct children are `role="group"` or `role="option"` —
    **no un-roled `<li>` in between**.
17. The trigger carries `aria-keyshortcuts="Meta+K Control+K"` and sits
    **inside** `<nav aria-label="CRM">` as a sibling of the subnav's `<ul>`,
    not as one of its `<li>`s.
18. ⌘K **does nothing** while a `role="dialog" aria-modal="true"` is in the
    DOM. The guard uses `document.querySelector(...)` and returns **before**
    `preventDefault()`.
19. `Escape` closes and returns DOM focus to the trigger.
20. `Tab` and `Shift+Tab` are `preventDefault()`ed; `Enter` with no active
    option does nothing and does not navigate.
21. The no-results state renders the literal `No matches for "<query>"` and
    the second line `Try a name, company, or deal.`, with **no**
    `role="listbox"`. The pre-query state is `Type to search`.
22. A thrown/rejected `searchCrmAction` produces the same no-results state.
23. The three `?q=` page filters behave exactly as before.
24. The palette sends no `tenantId`. `searchCrmAction(q)` parameter is a bare
    string.
25. `crm-pnw.test.ts`, `crm-pass.test.ts`, `theme-contrast.test.ts`,
    `workroom-namespace.test.ts` are green.
26. **No new dependency.** `package.json` byte-identical.
27. Three-part verify (vitest → build → Playwright) green.
28. `e2e/crm-quickfind.spec.ts` skips cleanly without the demo pair, throws
    without the owner pair. Mutates nothing.

## Verify command

Run from the repo root.

```
env -u DATABASE_URL npm test \
  && AUTH_SECRET=ci-build-placeholder npm run build \
  && AUTH_SECRET=local-playwright-secret npx playwright test \
    e2e/crm-quickfind.spec.ts e2e/crm.spec.ts e2e/workroom.spec.ts
```

`e2e/workroom.spec.ts` is in the list because `CRM_SUBNAV` walks the CRM
subnav and the trigger is a new child of that `<nav>` — the walk must not
break, and `CRM_SUBNAV` is a literal list of (name, href, url) that this
feature does **not** add to.

## Done evidence

<!-- Empty until /factory-verify runs. -->

## Notes

**Spec citations verified at intake.** The four list entry points are
`listOrganizations`, `listContacts`, `listDeals`, `listActivities` in
`lib/crm/queries.ts`. The `escapeIlike` path is at
`lib/crm/queries-drizzle.ts:40-57`. The deals left-join search is at
`:279-293`. `dealMatchesSearch` (`lib/crm/queries-shared.ts:133-166`) needs
the repo as its second argument. Space's precedent is
`components/space/quick-find.tsx:31-43` (⌘/Ctrl-K handler),
`:97-108` (arrow-key wrap), `:130` (`aria-keyshortcuts`),
`:161-185` (the Space bug this card deliberately does not reproduce),
and `lib/space/search.ts:27-31` (positional order).

**Calendar.** Sits behind `feat-001` (11.1), **JOB-007 (11.3)**, and
**JOB-009 (11.9)**. The acceptance criterion is "⌘K opens from any CRM
section"; there are five sections today and six after `/crm/tasks`. Building
11.10 before 11.9 freezes a list that 11.9 then falsifies, and the e2e's
six-section walk would be written against a route that does not exist. The
layout mount is unaffected either way.

**The client-boundary gate is the whole reason this feature is its own
feature.** `lib/client-boundary.test.ts:155-166` forbids a **value** import
of `lib/db`, `lib/{crm,space,rolodex}/{queries,schema,seed,reset}`,
`drizzle-orm`, or `@neondatabase/serverless` from anything under
`components/`, transitively, stopping only at `"use server"`. The
component must import **only** `search-actions` and **only types** from
`search` and `queries-shared`. The injection probe in the spec (drop `type`
from `import type`) is the proof this gate is still load-bearing — if it
does not fail, the gate is misreporting.

**Recorded limits, carried from the spec:** CI does not prove this feature
(job `ci` runs vitest + build with no Postgres, no Playwright); no Drizzle
SQL is executed in vitest; screen-reader quality is unverified; focus
trapping is one `preventDefault()`; unlinked activities are unreachable (a
permanent-ish state for activities with no contact and no deal); `role="status"`
is a count, not a summary; the 150 ms debounce is unmeasured for the CRM;
no visual regression coverage; Chromium only; history claims are unverified.

**Carried from session 1 (`progress.md`):** Reset demo before this card's
Playwright run — the 11.1 e2e leak persists in the demo tenant until 11.3
ships activity delete.
