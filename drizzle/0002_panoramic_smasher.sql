CREATE TYPE "public"."block_type" AS ENUM('paragraph', 'heading1', 'heading2', 'heading3', 'bulleted_list', 'numbered_list', 'todo', 'quote', 'divider', 'code', 'callout');--> statement-breakpoint
CREATE TYPE "public"."page_type" AS ENUM('page', 'database', 'row');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url');--> statement-breakpoint
CREATE TYPE "public"."view_kind" AS ENUM('table', 'board', 'list');--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"pageId" text NOT NULL,
	"type" "block_type" NOT NULL,
	"content" jsonb NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"parentId" text,
	"type" "page_type" NOT NULL,
	"title" text NOT NULL,
	"icon" text,
	"position" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"databaseId" text NOT NULL,
	"name" text NOT NULL,
	"type" "property_type" NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propertyOptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"propertyId" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rowValues" (
	"tenantId" text NOT NULL,
	"rowId" text NOT NULL,
	"propertyId" text NOT NULL,
	"value" jsonb,
	CONSTRAINT "rowValues_rowId_propertyId_pk" PRIMARY KEY("rowId","propertyId")
);
--> statement-breakpoint
CREATE TABLE "views" (
	"tenantId" text NOT NULL,
	"databaseId" text NOT NULL,
	"kind" "view_kind" NOT NULL,
	"config" jsonb NOT NULL,
	CONSTRAINT "views_databaseId_kind_pk" PRIMARY KEY("databaseId","kind")
);
--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_pageId_pages_id_fk" FOREIGN KEY ("pageId") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_parentId_pages_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_databaseId_pages_id_fk" FOREIGN KEY ("databaseId") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propertyOptions" ADD CONSTRAINT "propertyOptions_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propertyOptions" ADD CONSTRAINT "propertyOptions_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rowValues" ADD CONSTRAINT "rowValues_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rowValues" ADD CONSTRAINT "rowValues_rowId_pages_id_fk" FOREIGN KEY ("rowId") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rowValues" ADD CONSTRAINT "rowValues_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "views" ADD CONSTRAINT "views_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "views" ADD CONSTRAINT "views_databaseId_pages_id_fk" FOREIGN KEY ("databaseId") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;