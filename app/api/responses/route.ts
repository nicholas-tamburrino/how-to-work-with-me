import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/authorization";
import { trackEvent } from "@/lib/events";
import type { AnswersMap } from "@/lib/types";

/**
 * GET: fetch latest response (draft) for current user.
 * Ownership: query includes WHERE user_id = currentUserId so users only see their own data.
 */
export async function GET() {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[route hit] /api/responses GET");
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("responses")
    .select("id, answers, updated_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const msg = process.env.NODE_ENV === "development" ? error.message : "Failed to load response";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    responseId: data?.id ?? null,
    answers: (data?.answers as AnswersMap) ?? {},
    updatedAt: data?.updated_at ?? null,
  });
}

/**
 * POST: create or update response (autosave). Body: { responseId?: string, answers: AnswersMap }
 * Idempotent: repeated POSTs with the same responseId upsert the same row; responseId is stable.
 * Ownership: when updating, we fetch with WHERE id = responseId AND user_id = currentUserId;
 * if not found we return 404 (no leak that another user's response exists).
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[route hit] /api/responses POST");
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { responsesPostBodySchema } = await import("@/lib/api-schemas");
  const parsed = responsesPostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { responseId, answers } = parsed.data;

  const QUESTION_IDS = (await import("@/lib/questions")).QUESTION_IDS;
  const sanitized: AnswersMap = {};
  for (const id of QUESTION_IDS) {
    const v = answers[id];
    if (typeof v === "string" && v.trim().length <= 2000) {
      sanitized[id] = v.trim();
    } else if (typeof v === "string" && v.length > 0) {
      sanitized[id] = v.slice(0, 2000).trim();
    }
  }

  if (responseId) {
    const { data: existing } = await supabaseAdmin
      .from("responses")
      .select("id, user_id")
      .eq("id", responseId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    const ownerErr = requireOwner(userId, existing?.user_id);
    if (ownerErr) return ownerErr;

    const { data, error } = await supabaseAdmin
      .from("responses")
      .update({ answers: sanitized })
      .eq("id", responseId)
      .eq("user_id", userId)
      .select("id, updated_at")
      .single();

    if (error) {
      const msg = process.env.NODE_ENV === "development" ? error.message : "Failed to update";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    await trackEvent(userId, "response_saved", { response_id: data.id });
    return NextResponse.json({ responseId: data.id, updatedAt: data.updated_at });
  }

  const { data, error } = await supabaseAdmin
    .from("responses")
    .insert({ user_id: userId, answers: sanitized })
    .select("id, updated_at")
    .single();

  if (error) {
    const msg = process.env.NODE_ENV === "development" ? error.message : "Failed to create";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  await trackEvent(userId, "response_saved", { response_id: data.id });
  return NextResponse.json({ responseId: data.id, updatedAt: data.updated_at });
}
