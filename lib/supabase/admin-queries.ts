/**
 * Admin-only queries. Call only after verifying isAdmin(userId).
 * Never select answers or content_markdown; IDs and metadata only.
 */

import { supabaseAdmin } from "./server";

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface JobRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const AUDIT_LIMIT = 50;
const JOBS_FAILED_LIMIT = 30;

export async function getRecentAuditLogs(): Promise<AuditLogRow[]> {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("id, user_id, action, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(AUDIT_LIMIT);

  if (error) return [];
  return (data ?? []) as AuditLogRow[];
}

export async function getRecentFailedJobs(): Promise<JobRow[]> {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("id, user_id, type, status, error_message, created_at")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(JOBS_FAILED_LIMIT);

  if (error) return [];
  return (data ?? []) as JobRow[];
}
