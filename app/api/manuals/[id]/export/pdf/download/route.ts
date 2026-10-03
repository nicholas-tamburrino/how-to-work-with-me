import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * GET: download completed PDF export. Query: jobId
 * Validates ownership and returns PDF buffer.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "development") {
    console.log("[export/pdf/download GET] route hit");
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: manualId } = await params;
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!manualId) {
    return NextResponse.json({ error: "Manual id required" }, { status: 400 });
  }

  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  // Verify job belongs to user and is completed.
  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .select("id, user_id, type, status, result_id")
    .eq("id", jobId)
    .eq("user_id", userId)
    .eq("type", "export-pdf")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Export job not found" }, { status: 404 });
  }

  if (job.status !== "completed") {
    return NextResponse.json(
      { error: `Export job is ${job.status}, not completed` },
      { status: 400 }
    );
  }

  if (!job.result_id) {
    return NextResponse.json({ error: "Export result not available" }, { status: 404 });
  }

  // Decode base64 PDF stored in result_id.
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = Buffer.from(job.result_id, "base64");
  } catch {
    return NextResponse.json({ error: "Invalid export data" }, { status: 500 });
  }

  const filename = `how-to-work-with-me-${manualId.slice(0, 8)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
