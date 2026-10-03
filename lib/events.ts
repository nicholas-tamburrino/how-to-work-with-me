/**
 * Privacy-safe event tracking. Store only event_name + metadata (IDs etc).
 * Never store answers or manual content. For funnel/analytics later.
 */

import { supabaseAdmin } from "@/lib/supabase/server";

export type EventName =
  | "signup_completed"
  | "response_saved"
  | "manual_generation_started"
  | "manual_generation_completed"
  | "manual_generation_failed"
  | "pdf_exported"
  | "pdf_export_failed"
  | "share_created"
  | "share_revoked"
  | "demo_used";

const ALLOWED_NAMES: EventName[] = [
  "signup_completed",
  "response_saved",
  "manual_generation_started",
  "manual_generation_completed",
  "manual_generation_failed",
  "pdf_exported",
  "pdf_export_failed",
  "share_created",
  "share_revoked",
  "demo_used",
];

export async function trackEvent(
  userId: string | null,
  eventName: EventName,
  metadata: Record<string, string | number | boolean | null> = {}
): Promise<void> {
  if (!ALLOWED_NAMES.includes(eventName)) return;
  try {
    await supabaseAdmin.from("events").insert({
      user_id: userId,
      event_name: eventName,
      metadata: { ...metadata },
    });
  } catch {
    // Don't fail the request if event insert fails
  }
}
