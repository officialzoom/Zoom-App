---
name: DB migration quirk
description: drizzle-kit push fails in non-TTY/CI contexts; use psql directly for schema changes.
---

**Rule:** Never use `pnpm --filter @workspace/db run push` in automation or agent shells — it requires an interactive TTY for confirmations.

**Why:** When the schema change conflicts with existing data (e.g. adding a UNIQUE constraint to a populated column), drizzle-kit asks for confirmation. In non-TTY contexts it crashes with "Interactive prompts require a TTY terminal."

**How to apply:** Use `psql "$DATABASE_URL" -c "ALTER TABLE ..."` for additive changes (ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS). For destructive changes that require truncation, clear the table first manually.
