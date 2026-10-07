-- IF NOT EXISTS so a branch that already has contacts_email_lower_idx
-- (manual create, db:push, a lost journal row) does not fail migrate.
-- Postgres matches the index by name, not by definition: an index left behind
-- under this name with a different column list would skip this statement
-- without complaint, so the pg_indexes read-back in the job notes is the proof
-- the live index covers (tenantId, lower(email)).
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_email_lower_idx" ON "contacts" USING btree ("tenantId",lower("email"));
