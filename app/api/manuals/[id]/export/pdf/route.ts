import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getManualById } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/authorization";
import { enqueueExportPdf } from "@/lib/queue";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST: enqueue PDF export job. Returns 202 with jobId; client polls job status.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "development") {
    console.log("[export/pdf POST] route hit");
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: manualId } = await params;
  if (!manualId) {
    return NextResponse.json({ error: "Manual id required" }, { status: 400 });
  }

  const limit = await checkRateLimit("export-pdf", userId);
  if (!limit.success) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  const manual = await getManualById(manualId, userId);
  const ownerErr = requireOwner(userId, manual?.user_id);
  if (ownerErr) return ownerErr;

  // Deleted or non-existent manual: return clean 404 so UI can show friendly toast.
  if (!manual) {
    return NextResponse.json({ error: "Manual not found" }, { status: 404 });
  }

  // Check if manual has content (edited or generated).
  const finalMarkdown = manual.edited_markdown ?? manual.content_markdown ?? "";
  if (!finalMarkdown.trim()) {
    return NextResponse.json({ error: "Manual has no content" }, { status: 400 });
  }

  try {
    const jobId = await enqueueExportPdf({
      userId,
      manualId,
    });

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Export could not be started";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
