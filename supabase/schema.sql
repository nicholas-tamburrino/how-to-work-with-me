-- How To Work With Me – Supabase schema
-- Run this in Supabase SQL Editor.
-- Note: Auth is via Clerk. Server uses SUPABASE_SERVICE_ROLE_KEY and enforces
-- user_id ownership in application code on every query. RLS here is for future
-- use (e.g. if you switch to Supabase Auth or custom JWT with user_id).

-- Responses: questionnaire answers per user (keyed by question_id). Soft-delete via deleted_at.
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_updated_at ON responses(updated_at DESC);

CREATE TABLE IF NOT EXISTS manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  context TEXT NOT NULL DEFAULT 'general' CHECK (context IN ('general', 'work', 'partner')),
  version INT NOT NULL DEFAULT 1,
  family_id UUID,
  answers_snapshot JSONB,
  content_markdown TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manuals_user_id ON manuals(user_id);
CREATE INDEX IF NOT EXISTS idx_manuals_response_id ON manuals(response_id);
CREATE INDEX IF NOT EXISTS idx_manuals_created_at ON manuals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manuals_family_created ON manuals(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manuals_user_created ON manuals(user_id, created_at DESC);

-- Share links: hashed token only; optional expiry and revoke
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_links_manual_id ON share_links(manual_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token_hash ON share_links(token_hash);

-- Audit log (no sensitive payloads; action + minimal metadata only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Jobs: queue for generation (and later PDF export). Ready for Redis/Upstash swap.
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('generate', 'export-pdf')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  result_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);

-- Events: privacy-safe analytics (event_name + metadata IDs only; no answers or content)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  event_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_name_created ON events(event_name, created_at DESC);

-- RLS: Enable RLS on all tables. Policies are defined in supabase/rls.sql (run after this file).
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Trigger to keep responses.updated_at in sync
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS responses_updated_at ON responses;
CREATE TRIGGER responses_updated_at
  BEFORE UPDATE ON responses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Migration: add soft-delete columns if tables already exist
ALTER TABLE responses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Migration: add answers_snapshot + family_id to manuals for versioning and regeneration safety
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS answers_snapshot JSONB;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS family_id UUID;
CREATE INDEX IF NOT EXISTS idx_manuals_family_created ON manuals(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manuals_user_created ON manuals(user_id, created_at DESC);

-- Migration: add manual edit overlay fields so user edits are stored
-- separately from generated markdown while remaining keyed by manual id.
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS edited_markdown TEXT;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Migration: widen jobs.status constraint to include "running" to match queue implementation.
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed'));
