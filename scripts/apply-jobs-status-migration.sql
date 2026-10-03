-- Jobs status constraint migration
-- Run this in Supabase SQL Editor (or your Postgres client) against your actual database.
-- Fixes: "new row for relation \"jobs\" violates check constraint \"jobs_status_check\""
-- Allowed statuses: pending, running, completed, failed

-- 1) Drop the existing constraint (name may be jobs_status_check)
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- 2) Add the updated constraint including 'running'
ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed'));

-- Optional: verify (run separately if you want to confirm)
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'jobs'::regclass AND conname = 'jobs_status_check';
