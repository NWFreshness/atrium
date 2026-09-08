import { createPage, listPages, type SpaceRepository } from "./queries";

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
}
