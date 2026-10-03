import { supabaseAdmin } from "@/lib/supabase/server";

/** Actions we audit. Do not put raw answers or full manual content in metadata. */
export type AuditAction =
  | "manual_created"
  | "manual_exported"
  | "manual_deleted"
  | "manual_edited"
  | "manual_edit_reverted"
  | "data_deleted"
  | "share_link_created"
  | "share_link_revoked"
  | "share_links_revoked_by_manual";

/** Minimal metadata: ids only, no PII or content. */
export interface AuditMetadata {
  manual_id?: string;
  response_id?: string;
  share_link_id?: string;
  context?: string;
  version?: number;
  count?: number;
}

export async function auditLog(
  userId: string | null,
  action: AuditAction,
  metadata: AuditMetadata = {}
): Promise<void> {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action,
      metadata: { ...metadata },
    });
  } catch {
    // Don't fail the request if audit write fails
  }
}
