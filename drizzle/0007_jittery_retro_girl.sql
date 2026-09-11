-- CREATE TABLE IF NOT EXISTS so a branch that already has auth_throttles
-- (manual create, db:push, a lost journal row) does not fail migrate.
-- Postgres matches the table by name.
CREATE TABLE IF NOT EXISTS "auth_throttles" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"failedCount" integer NOT NULL,
	"windowStartedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "auth_throttles_subject_unique" UNIQUE("subject")
);
