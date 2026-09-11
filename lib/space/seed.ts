import { DEMO_PAGES, READING_LIST_ROWS, type SeedPage } from "./seed-content";
import {
  createBlock,
  createPage,
  createProperty,
  createPropertyOption,
  createRowValue,
  createView,
  listPages,
  type CreatePageInput,
  type CreatePropertyInput,
  type CreatePropertyOptionInput,
  type SpaceRepository,
} from "./queries";
import type { WriteOpts } from "../db/batch-transaction";

type PageTreeNode = {
  title: string;
  icon: string;
  blocks: NonNullable<SeedPage["blocks"]>;
  children: PageTreeNode[];
};

/**
 * The content module keeps pages flat, one entry per page with an explicit
 * `parent`, so adding a page is a one-line edit rather than a nesting puzzle.
 * The page model itself is a tree, so build one here — and fail loudly on a
 * parent title that doesn't exist, since a typo would otherwise silently orphan
 * a page into the root of the sidebar.
 */
export function buildDemoTree(pages: SeedPage[]): PageTreeNode[] {
  const nodes = new Map<string, PageTreeNode>(
    pages.map((page) => [
      page.title,
      {
        title: page.title,
        icon: page.icon,
        blocks: page.blocks ?? [],
        children: [],
      },
    ]),
  );

  const roots: PageTreeNode[] = [];
  for (const page of pages) {
    const node = nodes.get(page.title)!;
    if (page.parent === null) {
      roots.push(node);
      continue;
    }
    const parent = nodes.get(page.parent);
    if (!parent) {
      throw new Error(
        `Seed page "${page.title}" names an unknown parent "${page.parent}"`,
      );
    }
    parent.children.push(node);
  }
  return roots;
}

type PageIdsByTitle = Map<string, string>;

/**
 * Positions are the seed's own ordering, so the seed assigns them instead of
 * asking the database for `max(position)` once per row. That keeps a reseed
 * deterministic, drops a few hundred round trips from a reset, and is the only
 * thing that works for a batched reset: while statements are still being
 * collected, the rows they will insert are not visible to any query.
 */
type SeedPositions = Map<string, number>;

function nextSeedPosition(positions: SeedPositions, key: string): number {
  const position = positions.get(key) ?? 0;
  positions.set(key, position + 1);
  return position;
}

function nextPagePosition(
  positions: SeedPositions,
  parentId: string | null,
): number {
  return nextSeedPosition(positions, `page:${parentId ?? "root"}`);
}

/**
 * Creates the tree and returns the id of every page it made, keyed by title.
 *
 * A batched reset cannot read the pages back while it is still collecting
 * statements, so the ids travel with the tree instead of coming from a query —
 * and the database page that hangs off "Travel" can find its parent either way.
 */
async function seedTree(
  tenantId: string,
  parentId: string | null,
  specs: PageTreeNode[],
  positions: SeedPositions,
  repo?: SpaceRepository,
  opts?: WriteOpts,
): Promise<PageIdsByTitle> {
  const ids: PageIdsByTitle = new Map();

  for (const spec of specs) {
    const page = await createPage(
      tenantId,
      {
        title: spec.title,
        icon: spec.icon,
        parentId,
        type: "page",
        position: nextPagePosition(positions, parentId),
      },
      repo,
      opts,
    );
    ids.set(spec.title, page.id);
    for (const blockSpec of spec.blocks ?? []) {
      await createBlock(
        tenantId,
        {
          pageId: page.id,
          type: blockSpec.type,
          content: blockSpec.content,
          position: nextSeedPosition(positions, `block:${page.id}`),
        },
        repo,
        opts,
      );
    }
    if (spec.children?.length) {
      for (const [title, id] of await seedTree(
        tenantId,
        page.id,
        spec.children,
        positions,
        repo,
        opts,
      )) {
        ids.set(title, id);
      }
    }
  }

  return ids;
}

export async function seedSpace(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: WriteOpts,
): Promise<void> {
  // A reset collects the wipe and this reseed into one batch, so the rows are
  // still there to be found: the idempotence check only applies to a
  // standalone seed (`npm run db:seed`), which runs immediately.
  if (!opts?.batch) {
    const existing = await listPages(tenantId, repo);
    if (existing.length > 0) {
      return;
    }
  }
  const positions: SeedPositions = new Map();
  const pageIds = await seedTree(
    tenantId,
    null,
    buildDemoTree(DEMO_PAGES),
    positions,
    repo,
    opts,
  );
  await seedDemoDatabases(tenantId, pageIds, positions, repo, opts);
}

async function seedDemoDatabases(
  tenantId: string,
  pageIds: PageIdsByTitle,
  positions: SeedPositions,
  repo?: SpaceRepository,
  opts?: WriteOpts,
): Promise<void> {
  // Wrappers, not a second way to write: they add the position the seed would
  // otherwise have to read out of the database, and nothing else.
  const addPage = (input: CreatePageInput) =>
    createPage(
      tenantId,
      {
        ...input,
        position: nextPagePosition(positions, input.parentId ?? null),
      },
      repo,
      opts,
    );
  const addProperty = (input: CreatePropertyInput) =>
    createProperty(
      tenantId,
      {
        ...input,
        position: nextSeedPosition(positions, `property:${input.databaseId}`),
      },
      repo,
      opts,
    );
  const addOption = (input: CreatePropertyOptionInput) =>
    createPropertyOption(
      tenantId,
      {
        ...input,
        position: nextSeedPosition(positions, `option:${input.propertyId}`),
      },
      repo,
      opts,
    );

  const trip = await addPage({
    title: "Trip Planner",
    icon: "🧭",
    type: "database",
    parentId: pageIds.get("Travel") ?? null,
  });
  const status = await addProperty({
    databaseId: trip.id,
    name: "Status",
    type: "select",
  });
  const booked = await addOption({
    propertyId: status.id,
    name: "Booked",
    color: "green",
  });
  const planning = await addOption({
    propertyId: status.id,
    name: "Planning",
    color: "blue",
  });
  const dreaming = await addOption({
    propertyId: status.id,
    name: "Dreaming",
    color: "gray",
  });
  const done = await addOption({
    propertyId: status.id,
    name: "Done",
    color: "purple",
  });
  const region = await addProperty({
    databaseId: trip.id,
    name: "Region",
    type: "select",
  });
  const asia = await addOption({
    propertyId: region.id,
    name: "Asia",
    color: "pink",
  });
  const europe = await addOption({
    propertyId: region.id,
    name: "Europe",
    color: "teal",
  });
  const americas = await addOption({
    propertyId: region.id,
    name: "Americas",
    color: "orange",
  });
  const vibes = await addProperty({
    databaseId: trip.id,
    name: "Vibes",
    type: "multi_select",
  });
  const food = await addOption({
    propertyId: vibes.id,
    name: "Food",
    color: "amber",
  });
  const hiking = await addOption({
    propertyId: vibes.id,
    name: "Hiking",
    color: "green",
  });
  const culture = await addOption({
    propertyId: vibes.id,
    name: "Culture",
    color: "purple",
  });
  const budget = await addProperty({
    databaseId: trip.id,
    name: "Budget",
    type: "number",
  });
  const depart = await addProperty({
    databaseId: trip.id,
    name: "Depart",
    type: "date",
  });
  const flights = await addProperty({
    databaseId: trip.id,
    name: "Flights booked",
    type: "checkbox",
  });
  const guide = await addProperty({
    databaseId: trip.id,
    name: "Guide",
    type: "url",
  });

  async function tripRow(
    title: string,
    values: Record<string, unknown>,
  ): Promise<void> {
    const row = await addPage({ title, type: "row", parentId: trip.id });
    for (const [propertyId, value] of Object.entries(values)) {
      await createRowValue(
        tenantId,
        { rowId: row.id, propertyId, value },
        repo,
        opts,
      );
    }
  }

  await tripRow("Japan, ten days", {
    [status.id]: booked.id,
    [region.id]: asia.id,
    [vibes.id]: [food.id, culture.id],
    [budget.id]: 4800,
    [depart.id]: "2026-10-14",
    [flights.id]: true,
    [guide.id]: "https://japan-guide.com",
  });
  await tripRow("Lisbon long weekend", {
    [status.id]: planning.id,
    [region.id]: europe.id,
    [vibes.id]: [food.id],
    [budget.id]: 900,
    [depart.id]: "2026-09-05",
    [flights.id]: false,
  });
  await tripRow("Dolomites hut to hut", {
    [status.id]: dreaming.id,
    [region.id]: europe.id,
    [vibes.id]: [hiking.id],
    [budget.id]: 1500,
    [flights.id]: false,
  });
  await tripRow("Mexico City", {
    [status.id]: dreaming.id,
    [region.id]: americas.id,
    [vibes.id]: [food.id, culture.id],
    [budget.id]: 1700,
    [flights.id]: false,
  });
  await tripRow("Scottish Highlands", {
    [status.id]: done.id,
    [region.id]: europe.id,
    [vibes.id]: [hiking.id],
    [budget.id]: 700,
    [depart.id]: "2026-04-18",
    [flights.id]: true,
  });

  await createView(
    tenantId,
    {
      databaseId: trip.id,
      kind: "board",
      config: { groupPropertyId: status.id },
    },
    repo,
    opts,
  );
  await createView(
    tenantId,
    {
      databaseId: trip.id,
      kind: "table",
      config: { sort: { propertyId: budget.id, direction: "desc" } },
    },
    repo,
    opts,
  );
  await createView(
    tenantId,
    {
      databaseId: trip.id,
      kind: "list",
      config: {
        filters: [
          { propertyId: status.id, operator: "is", value: planning.id },
        ],
      },
    },
    repo,
    opts,
  );

  const reading = await addPage({
    title: "Reading List",
    icon: "📚",
    type: "database",
  });
  const author = await addProperty({
    databaseId: reading.id,
    name: "Author",
    type: "text",
  });
  const readStatus = await addProperty({
    databaseId: reading.id,
    name: "Status",
    type: "select",
  });
  const readStatusIds = new Map<string, string>();
  for (const [name, color] of [
    ["Finished", "green"],
    ["Reading", "blue"],
    ["Queued", "amber"],
    ["Shelved", "gray"],
  ] as const) {
    const option = await addOption({ propertyId: readStatus.id, name, color });
    readStatusIds.set(name, option.id);
  }
  const rating = await addProperty({
    databaseId: reading.id,
    name: "Rating",
    type: "number",
  });
  const pageCount = await addProperty({
    databaseId: reading.id,
    name: "Pages",
    type: "number",
  });
  const readingProperties: Record<string, string> = {
    Author: author.id,
    Status: readStatus.id,
    Rating: rating.id,
    Pages: pageCount.id,
  };

  for (const book of READING_LIST_ROWS) {
    const row = await addPage({
      title: book.title,
      type: "row",
      parentId: reading.id,
    });
    for (const [name, value] of Object.entries(book.values)) {
      const propertyId = readingProperties[name];
      if (!propertyId) {
        continue;
      }
      await createRowValue(
        tenantId,
        {
          rowId: row.id,
          propertyId,
          value:
            name === "Status"
              ? (readStatusIds.get(String(value)) ?? value)
              : value,
        },
        repo,
        opts,
      );
    }
  }
}
