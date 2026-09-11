import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import * as crm from "../crm/schema";
import * as rolodex from "../rolodex/schema";
import * as space from "../space/schema";

export const userRoles = ["owner", "demo", "member"] as const;
export type UserRole = (typeof userRoles)[number];

export const userRoleEnum = pgEnum("user_role", userRoles);

export const tenants = pgTable("tenants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("passwordHash").notNull(),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const organizations = crm.organizations;
export const contacts = crm.contacts;
export const deals = crm.deals;
export const activities = crm.activities;
export const dealStageEnum = crm.dealStageEnum;
export const contactStatusEnum = crm.contactStatusEnum;
export const activityTypeEnum = crm.activityTypeEnum;

export const pages = space.pages;
export const blocks = space.blocks;
export const properties = space.properties;
export const propertyOptions = space.propertyOptions;
export const rowValues = space.rowValues;
export const views = space.views;
export const pageTypeEnum = space.pageTypeEnum;
export const blockTypeEnum = space.blockTypeEnum;
export const propertyTypeEnum = space.propertyTypeEnum;
export const viewKindEnum = space.viewKindEnum;

export const people = rolodex.people;
export const interactions = rolodex.interactions;
export const importantDates = rolodex.importantDates;
export const facts = rolodex.facts;
export const news = rolodex.news;
export const reminders = rolodex.reminders;
export const gifts = rolodex.gifts;
export const connections = rolodex.connections;
export const circleEnum = rolodex.circleEnum;
export const interactionTypeEnum = rolodex.interactionTypeEnum;
export const importantDateTypeEnum = rolodex.importantDateTypeEnum;
export const giftKindEnum = rolodex.giftKindEnum;
export const connectionKindEnum = rolodex.connectionKindEnum;

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);
