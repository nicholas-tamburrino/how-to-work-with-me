-- How To Work With Me – Row Level Security (RLS) policies
-- Run this in Supabase SQL Editor after schema.sql.
--
-- Identity: We use Clerk for auth. user_id in tables stores Clerk user ID (text).
-- When using the anon key with a JWT, the JWT must include claim: app_user_id = Clerk user_id.
-- The app server currently uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS; ownership
-- is enforced in application code. These policies protect direct anon-key access and
-- apply when using anon key + JWT with app_user_id (e.g. future client or server calls).
--
-- No public access to manuals, responses, or raw share_links. Share link viewing
-- is done server-side via token hash lookup (service role); not via anon DB access.

-- Ensure RLS is enabled on all tables
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Helper: current app user id from JWT (Clerk user id). Null if no JWT or claim missing.
CREATE OR REPLACE FUNCTION app_user_id()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'app_user_id';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----- responses -----
-- Users can only select/insert/update their own rows (user_id = app_user_id).
DROP POLICY IF EXISTS "responses_select_own" ON responses;
CREATE POLICY "responses_select_own" ON responses
  FOR SELECT USING (user_id = app_user_id());

DROP POLICY IF EXISTS "responses_insert_own" ON responses;
CREATE POLICY "responses_insert_own" ON responses
  FOR INSERT WITH CHECK (user_id = app_user_id());

DROP POLICY IF EXISTS "responses_update_own" ON responses;
CREATE POLICY "responses_update_own" ON responses
  FOR UPDATE USING (user_id = app_user_id());

-- No DELETE policy: soft-delete only (UPDATE deleted_at). Service role can delete if needed.

-- ----- manuals -----
DROP POLICY IF EXISTS "manuals_select_own" ON manuals;
CREATE POLICY "manuals_select_own" ON manuals
  FOR SELECT USING (user_id = app_user_id());

DROP POLICY IF EXISTS "manuals_insert_own" ON manuals;
CREATE POLICY "manuals_insert_own" ON manuals
  FOR INSERT WITH CHECK (user_id = app_user_id());

DROP POLICY IF EXISTS "manuals_update_own" ON manuals;
CREATE POLICY "manuals_update_own" ON manuals
  FOR UPDATE USING (user_id = app_user_id());

-- ----- share_links -----
-- Read/write only when the linked manual belongs to the current user (for create/revoke).
-- Public share view is NOT done via anon DB access; it uses server-side token hash lookup.
DROP POLICY IF EXISTS "share_links_select_own" ON share_links;
CREATE POLICY "share_links_select_own" ON share_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM manuals m
      WHERE m.id = share_links.manual_id AND m.user_id = app_user_id()
    )
  );

DROP POLICY IF EXISTS "share_links_insert_own" ON share_links;
CREATE POLICY "share_links_insert_own" ON share_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM manuals m
      WHERE m.id = share_links.manual_id AND m.user_id = app_user_id()
    )
  );

DROP POLICY IF EXISTS "share_links_update_own" ON share_links;
CREATE POLICY "share_links_update_own" ON share_links
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM manuals m
      WHERE m.id = share_links.manual_id AND m.user_id = app_user_id()
    )
  );

-- ----- audit_logs -----
-- No user read access. Only service role can insert (for app audit). No anon INSERT.
DROP POLICY IF EXISTS "audit_logs_select_none" ON audit_logs;
CREATE POLICY "audit_logs_select_none" ON audit_logs
  FOR SELECT USING (false);

-- No INSERT/UPDATE/DELETE policy for anon: only service_role can write audit logs.

-- ----- events -----
-- No user read access (analytics are for internal use). Only service_role can insert.
DROP POLICY IF EXISTS "events_select_none" ON events;
CREATE POLICY "events_select_none" ON events FOR SELECT USING (false);

-- ----- jobs -----
DROP POLICY IF EXISTS "jobs_select_own" ON jobs;
CREATE POLICY "jobs_select_own" ON jobs
  FOR SELECT USING (user_id = app_user_id());

DROP POLICY IF EXISTS "jobs_insert_own" ON jobs;
CREATE POLICY "jobs_insert_own" ON jobs
  FOR INSERT WITH CHECK (user_id = app_user_id());

DROP POLICY IF EXISTS "jobs_update_own" ON jobs;
CREATE POLICY "jobs_update_own" ON jobs
  FOR UPDATE USING (user_id = app_user_id());
