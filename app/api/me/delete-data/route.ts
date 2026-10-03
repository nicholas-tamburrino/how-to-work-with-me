import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { softDeleteAllUserData } from "@/lib/supabase/server";
import { auditLog } from "@/lib/audit";

/**
 * DELETE: soft-delete all manuals and responses for the current user.
 * Requires confirmation in request body. Audit logged; no content in logs.
 */
export async function DELETE(req: NextRequest) {
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

  const { deleteDataBodySchema } = await import("@/lib/api-schemas");
  const parsed = deleteDataBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Confirmation required. Send confirm: 'DELETE_ALL_MY_DATA'." },
      { status: 400 }
    );
  }

  await softDeleteAllUserData(userId);
  await auditLog(userId, "data_deleted", {});

  return NextResponse.json({ ok: true });
}
