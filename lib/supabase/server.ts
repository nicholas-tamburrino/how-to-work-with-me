import { createClient } from "@supabase/supabase-js";
import type { ManualRow, ResponseRow, ShareLinkRow } from "@/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local (see .env.example)."
  );
}

/** Server-only Supabase client. Use for all DB access; enforce user_id in queries. */
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/**
 * List manuals for a user. Ownership enforced: WHERE user_id = userId.
 */
export async function listManualsForUser(userId: string): Promise<ManualRow[]> {
  const { data, error } = await supabaseAdmin
    .from("manuals")
    .select("id, user_id, response_id, context, version, content_markdown, created_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ManualRow[];
}

/**
 * Get a single manual by id. Returns null if not found or not owned by user.
 * Always include user_id in the query so users only access their own manuals.
 */
export async function getManualById(
  manualId: string,
  userId: string
): Promise<ManualRow | null> {
  const { data, error } = await supabaseAdmin
    .from("manuals")
    .select("*")
    .eq("id", manualId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  return data as ManualRow;
}

/**
 * Get a response by id. Returns null if not found or not owned by user.
 * Always include user_id in the query so users only access their own responses.
 */
export async function getResponseById(
  responseId: string,
  userId: string
): Promise<ResponseRow | null> {
  const { data, error } = await supabaseAdmin
    .from("responses")
    .select("*")
    .eq("id", responseId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  return data as ResponseRow;
}

/**
 * List share links for a manual. Ownership enforced: only if manual belongs to userId.
 */
export async function listShareLinksForManual(
  manualId: string,
  userId: string
): Promise<ShareLinkRow[]> {
  const { data: manual } = await supabaseAdmin
    .from("manuals")
    .select("id")
    .eq("id", manualId)
    .eq("user_id", userId)
    .single();
  if (!manual) return [];

  const { data, error } = await supabaseAdmin
    .from("share_links")
    .select("*")
    .eq("manual_id", manualId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ShareLinkRow[];
}

/**
 * Get manual by share token (hash). Returns manual content and id if link is valid.
 */
export async function getManualByShareToken(tokenHash: string): Promise<{
  manualId: string;
  contentMarkdown: string;
} | null> {
  const { data: link, error: linkError } = await supabaseAdmin
    .from("share_links")
    .select("id, manual_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .single();

  if (linkError || !link) return null;
  if (link.revoked_at) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

  const { data: manual, error: manualError } = await supabaseAdmin
    .from("manuals")
    .select("id, content_markdown")
    .eq("id", link.manual_id)
    .is("deleted_at", null)
    .single();

  if (manualError || !manual) return null;
  return { manualId: manual.id, contentMarkdown: manual.content_markdown };
}

/**
 * Soft-delete a manual. Ownership enforced. Audit logged.
 */
export async function softDeleteManual(manualId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("manuals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", manualId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .single();

  return !error && !!data;
}

/**
 * Soft-delete all manuals and responses for a user. Audit logged.
 */
export async function softDeleteAllUserData(userId: string): Promise<void> {
  await supabaseAdmin
    .from("manuals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId);

  await supabaseAdmin
    .from("responses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId);
}
