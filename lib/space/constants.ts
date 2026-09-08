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

export const VIEW_KINDS = ["table", "board", "list"] as const;

export type ViewKind = (typeof VIEW_KINDS)[number];
