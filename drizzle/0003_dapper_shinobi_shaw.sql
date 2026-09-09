CREATE TYPE "public"."rolodex_circle" AS ENUM('inner', 'close', 'wider', 'distant');--> statement-breakpoint
CREATE TYPE "public"."rolodex_connection_kind" AS ENUM('partner', 'parent_child', 'sibling', 'colleague', 'other');--> statement-breakpoint
CREATE TYPE "public"."rolodex_gift_kind" AS ENUM('idea', 'given', 'received');--> statement-breakpoint
CREATE TYPE "public"."rolodex_important_date_type" AS ENUM('birthday', 'anniversary', 'work_anniversary', 'child_birthday', 'other');--> statement-breakpoint
CREATE TYPE "public"."rolodex_interaction_type" AS ENUM('call', 'message', 'email', 'met', 'other');--> statement-breakpoint
CREATE TABLE "connections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"personA" text NOT NULL,
	"personB" text NOT NULL,
	"kind" "rolodex_connection_kind" NOT NULL,
	"aIsParent" boolean DEFAULT false NOT NULL,
	"label" text,
	"inverseLabel" text,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"personId" text NOT NULL,
	"text" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"personId" text NOT NULL,
	"name" text NOT NULL,
	"kind" "rolodex_gift_kind" NOT NULL,
	"occasion" text,
	"date" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "importantDates" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"personId" text NOT NULL,
	"type" "rolodex_important_date_type" NOT NULL,
	"label" text,
	"month" integer NOT NULL,
	"day" integer NOT NULL,
	"year" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"personId" text NOT NULL,
	"type" "rolodex_interaction_type" NOT NULL,
	"date" text NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"personId" text NOT NULL,
	"text" text NOT NULL,
	"date" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"jobTitle" text,
	"company" text,
	"city" text,
	"timezone" text,
	"circle" "rolodex_circle" NOT NULL,
	"cadenceOverrideDays" integer,
	"checkinsOff" boolean DEFAULT false NOT NULL,
	"snoozedUntil" text,
	"howMet" text,
	"metWhere" text,
	"metOn" text,
	"notes" text,
	"tags" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"personId" text NOT NULL,
	"text" text NOT NULL,
	"dueDate" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"doneAt" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_personA_people_id_fk" FOREIGN KEY ("personA") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_personB_people_id_fk" FOREIGN KEY ("personB") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_personId_people_id_fk" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_personId_people_id_fk" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importantDates" ADD CONSTRAINT "importantDates_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importantDates" ADD CONSTRAINT "importantDates_personId_people_id_fk" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_personId_people_id_fk" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_personId_people_id_fk" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_personId_people_id_fk" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;