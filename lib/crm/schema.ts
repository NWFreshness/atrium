import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "../db/schema";
import { ACTIVITY_TYPES, CONTACT_STATUSES, DEAL_STAGES } from "./constants";

export const dealStageEnum = pgEnum("deal_stage", DEAL_STAGES);
export const contactStatusEnum = pgEnum("contact_status", CONTACT_STATUSES);
export const activityTypeEnum = pgEnum("activity_type", ACTIVITY_TYPES);

export const organizations = pgTable("organizations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  website: text("website"),
  industry: text("industry"),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const contacts = pgTable("contacts", {
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
  organizationId: text("organizationId").references(() => organizations.id, {
    onDelete: "set null",
  }),
  status: contactStatusEnum("status").notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const deals = pgTable("deals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  organizationId: text("organizationId").references(() => organizations.id, {
    onDelete: "set null",
  }),
  contactId: text("contactId").references(() => contacts.id, {
    onDelete: "set null",
  }),
  stage: dealStageEnum("stage").notNull(),
  value: doublePrecision("value").notNull(),
  probability: integer("probability").notNull(),
  closeDate: timestamp("closeDate", { mode: "date", withTimezone: true }),
  boardOrder: integer("boardOrder").notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const activities = pgTable("activities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  type: activityTypeEnum("type").notNull(),
  contactId: text("contactId").references(() => contacts.id, {
    onDelete: "set null",
  }),
  dealId: text("dealId").references(() => deals.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  occurredAt: timestamp("occurredAt", { mode: "date", withTimezone: true }),
  dueDate: timestamp("dueDate", { mode: "date", withTimezone: true }),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});
