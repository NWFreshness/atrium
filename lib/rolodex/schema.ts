import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "../db/schema";
import {
  CIRCLES,
  CONNECTION_KINDS,
  DATE_TYPES,
  GIFT_KINDS,
  INTERACTION_TYPES,
} from "./constants";

export const circleEnum = pgEnum("rolodex_circle", CIRCLES);
export const interactionTypeEnum = pgEnum(
  "rolodex_interaction_type",
  INTERACTION_TYPES,
);
export const importantDateTypeEnum = pgEnum(
  "rolodex_important_date_type",
  DATE_TYPES,
);
export const giftKindEnum = pgEnum("rolodex_gift_kind", GIFT_KINDS);
export const connectionKindEnum = pgEnum(
  "rolodex_connection_kind",
  CONNECTION_KINDS,
);

export const people = pgTable("people", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  jobTitle: text("jobTitle"),
  company: text("company"),
  city: text("city"),
  timezone: text("timezone"),
  circle: circleEnum("circle").notNull(),
  cadenceOverrideDays: integer("cadenceOverrideDays"),
  checkinsOff: boolean("checkinsOff").notNull().default(false),
  snoozedUntil: text("snoozedUntil"),
  howMet: text("howMet"),
  metWhere: text("metWhere"),
  metOn: text("metOn"),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const interactions = pgTable("interactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  personId: text("personId")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  type: interactionTypeEnum("type").notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const importantDates = pgTable("importantDates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  personId: text("personId")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  type: importantDateTypeEnum("type").notNull(),
  label: text("label"),
  month: integer("month").notNull(),
  day: integer("day").notNull(),
  year: integer("year"),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const facts = pgTable("facts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  personId: text("personId")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const news = pgTable("news", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  personId: text("personId")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const reminders = pgTable("reminders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  personId: text("personId")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  dueDate: text("dueDate").notNull(),
  done: boolean("done").notNull().default(false),
  doneAt: text("doneAt"),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const gifts = pgTable("gifts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  personId: text("personId")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: giftKindEnum("kind").notNull(),
  occasion: text("occasion"),
  date: text("date").notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const connections = pgTable("connections", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  personA: text("personA")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  personB: text("personB")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  kind: connectionKindEnum("kind").notNull(),
  aIsParent: boolean("aIsParent").notNull().default(false),
  label: text("label"),
  inverseLabel: text("inverseLabel"),
  note: text("note"),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});
