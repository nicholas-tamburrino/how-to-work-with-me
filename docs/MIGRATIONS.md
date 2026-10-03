## Database migrations

Run these SQL snippets in the Supabase SQL editor (or your Postgres console) in order. They are designed to be **idempotent** where possible, so running them twice is usually safe.

Always run `supabase/schema.sql` first to create the base tables, then apply any migrations below.

---

### Jobs status constraint (jobs_status_check)

**Goal:** Allow job status `running` so generation and export jobs do not violate the DB check constraint.

**When:** Apply if you see `violates check constraint "jobs_status_check"` when setting status to `'running'`.

**How:** Run the script in Supabase SQL Editor:

```bash
# From project root, paste contents of scripts/apply-jobs-status-migration.sql into Supabase SQL Editor and run.
```

Or run the SQL in `scripts/apply-jobs-status-migration.sql` directly in the Supabase dashboard (SQL Editor). Allowed statuses after migration: `pending`, `running`, `completed`, `failed`.

---

### 2026-02-09 — Manual versioning + snapshots

**Goal:** Make manual regeneration robust by storing a snapshot of questionnaire answers on each manual, and prepare for version history via `family_id`.

**SQL:**

```sql
-- Add answers_snapshot + family_id for manuals (safe if columns already exist)
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS answers_snapshot JSONB;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS family_id UUID;

-- Helpful indexes for version history queries
CREATE INDEX IF NOT EXISTS idx_manuals_family_created ON manuals(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manuals_user_created ON manuals(user_id, created_at DESC);
```

