-- Phase 7.3: a B-tree index on tenantId for every tenant-scoped table —
-- list, filter and the demo reset all predicate on it.
--
-- drizzle-kit does not emit IF NOT EXISTS; it is added by hand (as 0004 did
-- for the enum label) so a branch that already carries one of these names does
-- not wedge the migrator. Postgres matches an existing index by NAME only,
-- not by definition.
CREATE INDEX IF NOT EXISTS "activities_tenantId_idx" ON "activities" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blocks_tenantId_idx" ON "blocks" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "connections_tenantId_idx" ON "connections" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_tenantId_idx" ON "contacts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deals_tenantId_idx" ON "deals" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "facts_tenantId_idx" ON "facts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gifts_tenantId_idx" ON "gifts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "importantDates_tenantId_idx" ON "importantDates" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "interactions_tenantId_idx" ON "interactions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_tenantId_idx" ON "news" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_tenantId_idx" ON "organizations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pages_tenantId_idx" ON "pages" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "people_tenantId_idx" ON "people" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_tenantId_idx" ON "properties" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "propertyOptions_tenantId_idx" ON "propertyOptions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_tenantId_idx" ON "reminders" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rowValues_tenantId_idx" ON "rowValues" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_tenantId_idx" ON "users" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "views_tenantId_idx" ON "views" USING btree ("tenantId");
