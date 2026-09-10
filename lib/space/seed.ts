import { DEMO_PAGES, READING_LIST_ROWS, type SeedPage } from "./seed-content";
import {
  createBlock,
  createPage,
  createProperty,
  createPropertyOption,
  createRowValue,
  createView,
  listPages,
  type SpaceRepository,
} from "./queries";

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

async function seedTree(
  tenantId: string,
  parentId: string | null,
  specs: PageTreeNode[],
  repo?: SpaceRepository,
): Promise<void> {
  for (const spec of specs) {
    const page = await createPage(
      tenantId,
      {
        title: spec.title,
        icon: spec.icon,
        parentId,
        type: "page",
      },
      repo,
    );
    for (const blockSpec of spec.blocks ?? []) {
      await createBlock(
        tenantId,
        { pageId: page.id, type: blockSpec.type, content: blockSpec.content },
        repo,
      );
    }
    if (spec.children?.length) {
      await seedTree(tenantId, page.id, spec.children, repo);
    }
  }
}

export async function seedSpace(
  tenantId: string,
  repo?: SpaceRepository,
): Promise<void> {
  const existing = await listPages(tenantId, repo);
  if (existing.length > 0) {
    return;
  }
  await seedTree(tenantId, null, buildDemoTree(DEMO_PAGES), repo);
  const pages = await listPages(tenantId, repo);
  await seedDemoDatabases(tenantId, pages, repo);
}

async function seedDemoDatabases(
  tenantId: string,
  pages: Awaited<ReturnType<typeof listPages>>,
  repo?: SpaceRepository,
): Promise<void> {
  const travel = pages.find((page) => page.title === "Travel");
  const trip = await createPage(
    tenantId,
    {
      title: "Trip Planner",
      icon: "🧭",
      type: "database",
      parentId: travel?.id ?? null,
    },
    repo,
  );
  const status = await createProperty(
    tenantId,
    { databaseId: trip.id, name: "Status", type: "select" },
    repo,
  );
  const booked = await createPropertyOption(
    tenantId,
    { propertyId: status.id, name: "Booked", color: "green" },
    repo,
  );
  const planning = await createPropertyOption(
    tenantId,
    { propertyId: status.id, name: "Planning", color: "blue" },
    repo,
  );
  const dreaming = await createPropertyOption(
    tenantId,
    { propertyId: status.id, name: "Dreaming", color: "gray" },
    repo,
  );
  const done = await createPropertyOption(
    tenantId,
    { propertyId: status.id, name: "Done", color: "purple" },
    repo,
  );
  const region = await createProperty(
    tenantId,
    { databaseId: trip.id, name: "Region", type: "select" },
    repo,
  );
  const asia = await createPropertyOption(
    tenantId,
    { propertyId: region.id, name: "Asia", color: "pink" },
    repo,
  );
  const europe = await createPropertyOption(
    tenantId,
    { propertyId: region.id, name: "Europe", color: "teal" },
    repo,
  );
  const americas = await createPropertyOption(
    tenantId,
    { propertyId: region.id, name: "Americas", color: "orange" },
    repo,
  );
  const vibes = await createProperty(
    tenantId,
    { databaseId: trip.id, name: "Vibes", type: "multi_select" },
    repo,
  );
  const food = await createPropertyOption(
    tenantId,
    { propertyId: vibes.id, name: "Food", color: "amber" },
    repo,
  );
  const hiking = await createPropertyOption(
    tenantId,
    { propertyId: vibes.id, name: "Hiking", color: "green" },
    repo,
  );
  const culture = await createPropertyOption(
    tenantId,
    { propertyId: vibes.id, name: "Culture", color: "purple" },
    repo,
  );
  const budget = await createProperty(
    tenantId,
    { databaseId: trip.id, name: "Budget", type: "number" },
    repo,
  );
  const depart = await createProperty(
    tenantId,
    { databaseId: trip.id, name: "Depart", type: "date" },
    repo,
  );
  const flights = await createProperty(
    tenantId,
    { databaseId: trip.id, name: "Flights booked", type: "checkbox" },
    repo,
  );
  const guide = await createProperty(
    tenantId,
    { databaseId: trip.id, name: "Guide", type: "url" },
    repo,
  );

  async function tripRow(
    title: string,
    values: Record<string, unknown>,
  ): Promise<void> {
    const row = await createPage(
      tenantId,
      { title, type: "row", parentId: trip.id },
      repo,
    );
    for (const [propertyId, value] of Object.entries(values)) {
      await createRowValue(
        tenantId,
        { rowId: row.id, propertyId, value },
        repo,
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
  );
  await createView(
    tenantId,
    {
      databaseId: trip.id,
      kind: "table",
      config: { sort: { propertyId: budget.id, direction: "desc" } },
    },
    repo,
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
  );

  const reading = await createPage(
    tenantId,
    { title: "Reading List", icon: "📚", type: "database" },
    repo,
  );
  const author = await createProperty(
    tenantId,
    { databaseId: reading.id, name: "Author", type: "text" },
    repo,
  );
  const readStatus = await createProperty(
    tenantId,
    { databaseId: reading.id, name: "Status", type: "select" },
    repo,
  );
  const readStatusIds = new Map<string, string>();
  for (const [name, color] of [
    ["Finished", "green"],
    ["Reading", "blue"],
    ["Queued", "amber"],
    ["Shelved", "gray"],
  ] as const) {
    const option = await createPropertyOption(
      tenantId,
      { propertyId: readStatus.id, name, color },
      repo,
    );
    readStatusIds.set(name, option.id);
  }
  const rating = await createProperty(
    tenantId,
    { databaseId: reading.id, name: "Rating", type: "number" },
    repo,
  );
  const pageCount = await createProperty(
    tenantId,
    { databaseId: reading.id, name: "Pages", type: "number" },
    repo,
  );
  const readingProperties: Record<string, string> = {
    Author: author.id,
    Status: readStatus.id,
    Rating: rating.id,
    Pages: pageCount.id,
  };

  for (const book of READING_LIST_ROWS) {
    const row = await createPage(
      tenantId,
      { title: book.title, type: "row", parentId: reading.id },
      repo,
    );
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
      );
    }
  }
}
