import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * POST: revoke a share link by id. Admin only (ADMIN_USER_IDS).
 * Body: { shareLinkId: string (UUID) }
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { shareLinkId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const shareLinkId = body.shareLinkId?.trim();
  if (!shareLinkId) {
    return NextResponse.json({ error: "shareLinkId required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", shareLinkId)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found or already revoked" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
