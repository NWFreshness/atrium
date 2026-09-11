-- Idempotent: branch state may already carry the label (manual add, db:push, or
-- a lost journal row). Drizzle's journal makes a re-run unlikely, not impossible.
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'member';