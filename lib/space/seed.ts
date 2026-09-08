import { BLOCK_TYPES, type BlockType } from "./constants";
import {
  createBlock,
  createPage,
  listPages,
  type SpaceRepository,
} from "./queries";

type PageSpec = {
  title: string;
  icon: string;
  children?: PageSpec[];
};

const DEMO_TREE: PageSpec[] = [
  { title: "Home", icon: "🏠" },
  {
    title: "Projects",
    icon: "🗂️",
    children: [
      {
        title: "Balcony Garden",
        icon: "🌱",
        children: [{ title: "Planting Calendar", icon: "📅" }],
      },
      {
        title: "Home Lab Rebuild",
        icon: "🖥️",
        children: [
          { title: "Parts Inventory", icon: "📦" },
          { title: "Network Map", icon: "🕸️" },
        ],
      },
      {
        title: "Writing",
        icon: "✍️",
        children: [
          { title: "Blog: Slow Tools", icon: "📝" },
          { title: "Essay Ideas", icon: "🗒️" },
        ],
      },
      { title: "Bike Restoration", icon: "🚲" },
    ],
  },
  {
    title: "Travel",
    icon: "✈️",
    children: [
      {
        title: "Japan 2026",
        icon: "🗾",
        children: [
          { title: "Tokyo Food Shortlist", icon: "🍜" },
          { title: "Kyoto Notes", icon: "⛩️" },
        ],
      },
      { title: "Points and Miles", icon: "🎫" },
      { title: "Packing Checklist", icon: "🧳" },
    ],
  },
  {
    title: "Notes",
    icon: "🧠",
    children: [
      {
        title: "Recipes",
        icon: "🍝",
        children: [{ title: "Sourdough, Slowly", icon: "🍞" }],
      },
      { title: "Quotes", icon: "💬" },
      { title: "Films to Watch", icon: "🎬" },
      { title: "Ideas Inbox", icon: "💡" },
    ],
  },
  {
    title: "Health & Habits",
    icon: "💪",
    children: [
      { title: "Training Plan", icon: "🏋️" },
      { title: "Sleep Log", icon: "😴" },
    ],
  },
  {
    title: "Work",
    icon: "💼",
    children: [
      { title: "Weekly Review", icon: "🔁" },
      { title: "Who Does What", icon: "👥" },
      {
        title: "Meeting Notes",
        icon: "📓",
        children: [{ title: "Platform Kickoff", icon: "🚀" }],
      },
    ],
  },
  {
    title: "Learning",
    icon: "🎓",
    children: [
      { title: "Rust Notes", icon: "🦀" },
      { title: "Shortcuts Worth Learning", icon: "⌨️" },
    ],
  },
  {
    title: "Archive",
    icon: "🗄️",
    children: [{ title: "2025 in Review", icon: "🧾" }],
  },
];

async function seedTree(
  tenantId: string,
  parentId: string | null,
  specs: PageSpec[],
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
  await seedTree(tenantId, null, DEMO_TREE, repo);
  const pages = await listPages(tenantId, repo);
  const home = pages.find(
    (page) => page.title === "Home" && page.parentId === null,
  );
  if (!home) {
    return;
  }
  const showcase: { type: BlockType; content: Record<string, unknown> }[] = [
    { type: "heading1", content: { text: "Welcome back" } },
    {
      type: "paragraph",
      content: {
        text: "This is your personal space: notes, plans and lists in one place.",
      },
    },
    { type: "heading2", content: { text: "This week" } },
    { type: "heading3", content: { text: "Tips" } },
    {
      type: "callout",
      content: {
        text: "Type / anywhere in an empty block to change its type.",
      },
    },
    {
      type: "todo",
      content: { text: "Water the balcony garden", checked: true },
    },
    {
      type: "bulleted_list",
      content: { text: "Projects — anything with an outcome" },
    },
    { type: "numbered_list", content: { text: "Write the slow tools draft" } },
    { type: "quote", content: { text: "Slow is smooth, smooth is fast." } },
    { type: "divider", content: {} },
    {
      type: "code",
      content: { text: "hostnamectl set-hostname node-01" },
    },
  ];
  for (const spec of showcase) {
    await createBlock(
      tenantId,
      { pageId: home.id, type: spec.type, content: spec.content },
      repo,
    );
  }
  const seededTypes = new Set(showcase.map((spec) => spec.type));
  for (const type of BLOCK_TYPES) {
    if (!seededTypes.has(type)) {
      await createBlock(tenantId, { pageId: home.id, type, content: {} }, repo);
    }
  }
}
