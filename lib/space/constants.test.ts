import { describe, expect, it } from "vitest";
import {
  BLOCK_TYPES,
  filterBlockMenu,
  PAGE_TYPES,
  PROPERTY_TYPES,
  VIEW_KINDS,
} from "./constants";

describe("PAGE_TYPES", () => {
  it("lists Bench page types in order", () => {
    expect(PAGE_TYPES).toEqual(["page", "database", "row"]);
  });
});

describe("BLOCK_TYPES", () => {
  it("lists the eleven Space block types", () => {
    expect(BLOCK_TYPES).toEqual([
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
    ]);
  });
});

describe("filterBlockMenu", () => {
  it("filters by label and type", () => {
    expect(filterBlockMenu("head").map((item) => item.type)).toEqual([
      "heading1",
      "heading2",
      "heading3",
    ]);
    expect(filterBlockMenu("todo").map((item) => item.type)).toEqual(["todo"]);
    expect(filterBlockMenu("").map((item) => item.type)).toEqual([
      ...BLOCK_TYPES,
    ]);
  });
});

describe("PROPERTY_TYPES", () => {
  it("lists Bench property types with type fixed at create", () => {
    expect(PROPERTY_TYPES).toEqual([
      "text",
      "number",
      "select",
      "multi_select",
      "date",
      "checkbox",
      "url",
    ]);
  });
});

describe("VIEW_KINDS", () => {
  it("lists table, board, and list", () => {
    expect(VIEW_KINDS).toEqual(["table", "board", "list"]);
  });
});
