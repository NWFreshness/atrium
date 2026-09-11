-- Uniqueness on `users.email` moves from the byte-exact column to `lower(email)`,
-- which is the comparison signup and login already use.
--
-- Idempotent: a branch may already carry either object (manual change, db:push,
-- or a lost journal row). Drizzle's journal makes a re-run unlikely, not
-- impossible. Postgres matches an existing index by **name** only, not by
-- definition, so `IF NOT EXISTS` will keep whatever `users_email_lower_idx`
-- already exists even if its expression differs.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_idx" ON "users" USING btree (lower("email"));
