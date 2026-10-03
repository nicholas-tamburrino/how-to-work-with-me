import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateShareToken } from "@/lib/security/token";
import { auditLog } from "@/lib/audit";
import { requireOwner } from "@/lib/authorization";
import { trackEvent } from "@/lib/events";
import { checkRateLimit } from "@/lib/rate-limit";

// Ownership: we only allow creating/revoking share links for manuals where user_id = currentUserId. Return 404 (not 403) to avoid leaking resource existence.

/**
 * POST: create share link. Body: { manualId: string }
 * Creates a new share link (or use GET-or-create pattern elsewhere if idempotent by manual is needed).
 * Returns { ok: true, token, url, id, expires_at, created_at }. Raw token only in url this once.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[share POST] route hit, userId present:", !!userId);
  }
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await checkRateLimit("share", userId);
  if (!limit.success) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bodyObj = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (process.env.NODE_ENV === "development") {
    console.log("[share POST] start", {
      hasUser: !!userId,
      bodyKeys: Object.keys(bodyObj),
      manualId: bodyObj.manualId ?? bodyObj.manual_id ?? null,
    });
  }

  const { sharePostBodySchema } = await import("@/lib/api-schemas");
  const parsed = sharePostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { manualId, expiresInDays } = parsed.data;
  const expires_at =
    expiresInDays != null
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { data: manual } = await supabaseAdmin
    .from("manuals")
    .select("id, user_id, deleted_at")
    .eq("id", manualId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  const ownerErr = requireOwner(userId, manual?.user_id);
  if (process.env.NODE_ENV === "development") {
    console.log("[share POST] lookup", {
      userId,
      manualId,
      found: !!manual,
      ownerErr: !!ownerErr,
      deleted: !!(manual && (manual as { deleted_at?: unknown }).deleted_at),
    });
  }
  if (ownerErr) {
    if (process.env.NODE_ENV === "development") {
      console.log("[share POST] outcome: manual_not_found", { manualId, userId });
    }
    return NextResponse.json({ error: "Manual not found" }, { status: 404 });
  }

  const { token, tokenHash } = generateShareToken();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const url = `${baseUrl}/s/${token}`;

  const { data: link, error } = await supabaseAdmin
    .from("share_links")
    .insert({
      manual_id: manualId,
      token_hash: tokenHash,
      expires_at,
      revoked_at: null,
    })
    .select("id, expires_at, created_at")
    .single();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("[share POST] outcome: insert_failed", { manualId, userId, error: error.message });
    }
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }

  await auditLog(userId, "share_link_created", {
    manual_id: manualId,
    share_link_id: link.id,
  });

  if (process.env.NODE_ENV === "development") {
    console.log("[share POST] outcome: created", { manualId, userId, shareLinkId: link.id });
  }

  return NextResponse.json({
    ok: true,
    token,
    url,
    id: link.id,
    expires_at: link.expires_at,
    created_at: link.created_at,
  });
}

/**
 * DELETE: revoke share link(s). Body: { shareLinkId: string } or { manualId: string }
 * - shareLinkId: revoke that link. - manualId: revoke all active links for that manual (auth + ownership).
 */
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[share DELETE] route hit, userId present:", !!userId);
  }
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await checkRateLimit("share", userId);
  if (!limit.success) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { shareDeleteBodySchema } = await import("@/lib/api-schemas");
  const parsed = shareDeleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { shareLinkId, manualId } = parsed.data;

  const revokedAt = new Date().toISOString();

  if (shareLinkId) {
    const { data: link } = await supabaseAdmin
      .from("share_links")
      .select("id, manual_id")
      .eq("id", shareLinkId)
      .single();

    if (!link) {
      if (process.env.NODE_ENV === "development") {
        console.log("[share DELETE] outcome: not_found", { shareLinkId, userId });
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: manual } = await supabaseAdmin
      .from("manuals")
      .select("id, user_id")
      .eq("id", link.manual_id)
      .eq("user_id", userId)
      .single();

    const ownerErr = requireOwner(userId, manual?.user_id);
    if (ownerErr) {
      if (process.env.NODE_ENV === "development") {
        console.log("[share DELETE] outcome: forbidden", { shareLinkId, userId });
      }
      return ownerErr;
    }

    await supabaseAdmin
      .from("share_links")
      .update({ revoked_at: revokedAt })
      .eq("id", shareLinkId);

    await auditLog(userId, "share_link_revoked", {
      share_link_id: shareLinkId,
      manual_id: link.manual_id,
    });
    await trackEvent(userId, "share_revoked", { share_link_id: shareLinkId });

    if (process.env.NODE_ENV === "development") {
      console.log("[share DELETE] outcome: revoked_one", { shareLinkId, manualId: link.manual_id, userId });
    }
    return NextResponse.json({ ok: true });
  }

  if (manualId) {
    const { data: manual } = await supabaseAdmin
      .from("manuals")
      .select("id, user_id")
      .eq("id", manualId)
      .eq("user_id", userId)
      .maybeSingle();

    const ownerErr = requireOwner(userId, manual?.user_id);
    if (ownerErr) {
      if (process.env.NODE_ENV === "development") {
        console.log("[share DELETE] outcome: manual_not_found", { manualId, userId });
      }
      return NextResponse.json({ error: "Manual not found" }, { status: 404 });
    }

    const { data: updated } = await supabaseAdmin
      .from("share_links")
      .update({ revoked_at: revokedAt })
      .eq("manual_id", manualId)
      .is("revoked_at", null)
      .select("id");

    const count = updated?.length ?? 0;
    await auditLog(userId, "share_links_revoked_by_manual", {
      manual_id: manualId,
      count,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[share DELETE] outcome: revoked_by_manual", { manualId, userId, count });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
}
