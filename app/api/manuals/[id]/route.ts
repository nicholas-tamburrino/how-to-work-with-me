import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { softDeleteManual, supabaseAdmin } from "@/lib/supabase/server";
import { auditLog } from "@/lib/audit";

/**
 * PATCH: update or clear the editable markdown overlay for a manual.
 * Stores user edits separately from the generated markdown content.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: manualId } = await params;
  if (!manualId) {
    return NextResponse.json({ error: "Manual id required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Revert clears the edit layer only; generated content is untouched.
  if (body && typeof body === "object" && "revertToGenerated" in body) {
    const { revertToGenerated } = body as { revertToGenerated?: boolean };
    if (!revertToGenerated) {
      return NextResponse.json({ error: "Invalid revert payload" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("manuals")
      .update({ edited_markdown: null, edited_at: null })
      .eq("id", manualId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      return NextResponse.json({ error: "Could not revert edits" }, { status: 500 });
    }

    await auditLog(userId, "manual_edit_reverted", { manual_id: manualId });

    return NextResponse.json({ ok: true });
  }

  if (!body || typeof body !== "object" || !("markdown" in body)) {
    return NextResponse.json({ error: "Missing markdown field" }, { status: 400 });
  }

  const { markdown } = body as { markdown?: string };
  if (typeof markdown !== "string") {
    return NextResponse.json({ error: "Markdown must be a string" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("manuals")
    .update({ edited_markdown: markdown, edited_at: now })
    .eq("id", manualId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: "Could not save edits" }, { status: 500 });
  }

  await auditLog(userId, "manual_edited", { manual_id: manualId });

  return NextResponse.json({ ok: true, editedAt: now });
}

/**
 * DELETE: soft-delete a manual. Ownership enforced; returns 404 if not found or not owner.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: manualId } = await params;
  if (!manualId) {
    return NextResponse.json({ error: "Manual id required" }, { status: 400 });
  }

  // First, look up the manual to distinguish between:
  // - not found (idempotent delete)
  // - ownership mismatch
  // - active vs already soft-deleted
  const { data: manual, error: lookupError } = await supabaseAdmin
    .from("manuals")
    .select("id, user_id, deleted_at")
    .eq("id", manualId)
    .single();

  if (lookupError && lookupError.code !== "PGRST116") {
    return NextResponse.json({ error: "Could not delete manual" }, { status: 500 });
  }

  const found = !!manual;
  const ownerErr = !!manual && manual.user_id !== userId;

  if (!found) {
    if (process.env.NODE_ENV === "development") {
      console.log("[manuals DELETE]", {
        userId,
        manualId,
        found: false,
        ownerErr: false,
        alreadyDeleted: true,
      });
    }
    // Idempotent delete: treat missing manuals as already deleted.
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  if (ownerErr) {
    if (process.env.NODE_ENV === "development") {
      console.log("[manuals DELETE]", {
        userId,
        manualId,
        found: true,
        ownerErr: true,
        alreadyDeleted: false,
      });
    }
    // Preserve "Not found" semantics for non-owners, but never mark found:false.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Manual belongs to user; if it's already soft-deleted, treat as idempotent success.
  if (manual.deleted_at) {
    if (process.env.NODE_ENV === "development") {
      console.log("[manuals DELETE]", {
        userId,
        manualId,
        found: true,
        ownerErr: false,
        alreadyDeleted: true,
      });
    }
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  const now = new Date().toISOString();

  // Best-effort cleanup:
  // - revoke any active share links for this manual
  // - clear any edit overlay fields on the manual row
  await supabaseAdmin
    .from("share_links")
    .update({ revoked_at: now })
    .eq("manual_id", manualId)
    .is("revoked_at", null);

  const deleted = await softDeleteManual(manualId, userId);

  if (process.env.NODE_ENV === "development") {
    console.log("[manuals DELETE]", {
      userId,
      manualId,
      found: true,
      ownerErr: false,
      alreadyDeleted: !deleted,
    });
  }

  if (!deleted) {
    // If we get here, something went wrong with the soft-delete update.
    return NextResponse.json({ error: "Could not delete manual" }, { status: 500 });
  }

  // Explicitly clear edit overlay fields as part of deletion.
  await supabaseAdmin
    .from("manuals")
    .update({ edited_markdown: null, edited_at: null })
    .eq("id", manualId);

  await auditLog(userId, "manual_deleted", { manual_id: manualId });

  return NextResponse.json({ ok: true });
}
