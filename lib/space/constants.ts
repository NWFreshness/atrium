export const PAGE_TYPES = ["page", "database", "row"] as const;

export type PageType = (typeof PAGE_TYPES)[number];

export const BLOCK_TYPES = [
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "bulleted_list",
  "numbered_list",
  "todo",
  "quote",
  "divider",
  "code",
  "callout",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_MENU: { type: BlockType; label: string }[] = [
  { type: "paragraph", label: "Paragraph" },
  { type: "heading1", label: "Heading 1" },
  { type: "heading2", label: "Heading 2" },
  { type: "heading3", label: "Heading 3" },
  { type: "bulleted_list", label: "Bulleted list" },
  { type: "numbered_list", label: "Numbered list" },
  { type: "todo", label: "To-do" },
  { type: "quote", label: "Quote" },
  { type: "divider", label: "Divider" },
  { type: "code", label: "Code" },
  { type: "callout", label: "Callout" },
];

export function filterBlockMenu(query: string): typeof BLOCK_MENU {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return BLOCK_MENU;
  }
  return BLOCK_MENU.filter(
    (item) =>
      item.label.toLowerCase().includes(needle) ||
      item.type.replaceAll("_", " ").includes(needle),
  );
}

export const PROPERTY_TYPES = [
  "text",
  "number",
  "select",
  "multi_select",
  "date",
  "checkbox",
  "url",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const OPTION_COLORS = [
  "gray",
  "blue",
  "amber",
  "green",
  "red",
  "purple",
  "teal",
  "orange",
] as const;

export const VIEW_KINDS = ["table", "board", "list"] as const;

export type ViewKind = (typeof VIEW_KINDS)[number];
