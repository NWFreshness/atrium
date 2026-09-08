import {
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "../db/schema";
import {
  BLOCK_TYPES,
  PAGE_TYPES,
  PROPERTY_TYPES,
  VIEW_KINDS,
} from "./constants";

export const pageTypeEnum = pgEnum("page_type", PAGE_TYPES);
export const blockTypeEnum = pgEnum("block_type", BLOCK_TYPES);
export const propertyTypeEnum = pgEnum("property_type", PROPERTY_TYPES);
export const viewKindEnum = pgEnum("view_kind", VIEW_KINDS);

export const pages = pgTable(
  "pages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenantId")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    parentId: text("parentId"),
    type: pageTypeEnum("type").notNull(),
    title: text("title").notNull(),
    icon: text("icon"),
    position: integer("position").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "pages_parentId_pages_id_fk",
    }).onDelete("cascade"),
  ],
);

export const blocks = pgTable("blocks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  pageId: text("pageId")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  type: blockTypeEnum("type").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  position: integer("position").notNull(),
});

export const properties = pgTable("properties", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  databaseId: text("databaseId")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: propertyTypeEnum("type").notNull(),
  position: integer("position").notNull(),
});

export const propertyOptions = pgTable("propertyOptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  propertyId: text("propertyId")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  position: integer("position").notNull(),
});

export const rowValues = pgTable(
  "rowValues",
  {
    tenantId: text("tenantId")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    rowId: text("rowId")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    propertyId: text("propertyId")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    value: jsonb("value").$type<unknown>(),
  },
  (table) => [primaryKey({ columns: [table.rowId, table.propertyId] })],
);

export const views = pgTable(
  "views",
  {
    tenantId: text("tenantId")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    databaseId: text("databaseId")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    kind: viewKindEnum("kind").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.databaseId, table.kind] })],
);
