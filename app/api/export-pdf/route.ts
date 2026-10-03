import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getManualById } from "@/lib/supabase/server";
import { auditLog } from "@/lib/audit";
import { requireOwner } from "@/lib/authorization";
import { trackEvent } from "@/lib/events";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildPdf } from "@/lib/pdf/renderMarkdown";

function devLog(step: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.log("[export-pdf]", step, data ?? {});
  }
}

/**
 * GET: export manual as PDF. Query: manualId
 * Generates PDF server-side with pdf-lib (no file system fonts). Returns PDF buffer.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  devLog("start", { manualId: req.nextUrl.searchParams.get("manualId") ?? null, userId: !!userId });

  const limit = await checkRateLimit("export-pdf", userId);
  if (!limit.success) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  const manualId = req.nextUrl.searchParams.get("manualId");
  if (!manualId) {
    return NextResponse.json({ error: "manualId required" }, { status: 400 });
  }

  const manual = await getManualById(manualId, userId);
  const hasContent = !!(manual?.content_markdown?.trim());
  devLog("loaded", { found: !!manual, hasContent });

  const ownerErr = requireOwner(userId, manual?.user_id);
  if (ownerErr) return ownerErr;

  if (!manual?.content_markdown?.trim()) {
    return NextResponse.json({ error: "Manual has no content" }, { status: 400 });
  }

  try {
    const buffer = await buildPdf(manual);
    devLog("rendered", { bytes: buffer.length });

    await auditLog(userId, "manual_exported", { manual_id: manualId });
    await trackEvent(userId, "pdf_exported", { manual_id: manualId });

    devLog("returning 200", {});

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="how-to-work-with-me.pdf"',
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[export-pdf] error", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
    const msg = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
