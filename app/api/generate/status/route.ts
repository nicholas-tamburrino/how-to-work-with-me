import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { OPENAI_API_KEY_REJECTED_MESSAGE } from "@/lib/openai-errors";
import { logger } from "@/lib/logger";

/**
 * GET: poll generation job status. Query: jobId
 * Returns { status, manualId?, error?, errorCode? }. errorCode "openai_401" when API key was rejected (no key value in response).
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const { data: job, error } = await supabaseAdmin
    .from("jobs")
    .select("status, result_id, error_message, user_id")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !job) {
    logger.info("[demo] status not found", { jobId });
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[job status]", {
      jobId,
      status: job.status,
      resultId: job.result_id ?? null,
      error: job.error_message ?? null,
    });
  }

  const body: Record<string, unknown> = {
    status: job.status,
    manualId: job.result_id ?? null,
    error: job.error_message ?? null,
  };
  if (job.error_message === OPENAI_API_KEY_REJECTED_MESSAGE) {
    body.errorCode = "openai_401";
  }
  return NextResponse.json(body);
}
