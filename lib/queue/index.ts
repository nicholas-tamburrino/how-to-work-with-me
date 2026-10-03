/**
 * Queue abstraction for long-running tasks (generate, export-pdf).
 * Current: async server execution (fire-and-forget) for generation. PDF export remains sync
 * (signed URLs are short-lived); can add enqueueExportPdf + poll when using a worker.
 * Replace with Redis/Upstash when needed. Never log job payload content (answers, manual text).
 */

import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { trackEvent } from "@/lib/events";
import type { AnswersMap, ManualContext } from "@/lib/types";

export type JobType = "generate" | "export-pdf";

export const JOB_STATUSES = ["pending", "running", "completed", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

if (process.env.NODE_ENV === "development") {
  // Ensure DB jobs_status_check allows these; run scripts/apply-jobs-status-migration.sql if you see constraint errors.
  console.log("[queue] allowed job statuses (must match DB constraint):", [...JOB_STATUSES]);
}

export interface EnqueueGeneratePayload {
  userId: string;
  responseId: string;
  context: ManualContext;
  /** Snapshot of answers used for generation. Do not log. */
  answers: AnswersMap;
  /** Optional source tag for observability (e.g. "demo"). */
  source?: "demo";
}

export interface EnqueueExportPdfPayload {
  userId: string;
  manualId: string;
}

/** Create job row and run work in background. Returns jobId immediately. */
export async function enqueueGenerate(payload: EnqueueGeneratePayload): Promise<string> {
  const { data: job, error } = await supabaseAdmin
    .from("jobs")
    .insert({
      user_id: payload.userId,
      type: "generate",
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !job) {
    logger.error("queue_enqueue_failed", { type: "generate", message: error?.message });
    throw new Error(error?.message ?? "Failed to create job");
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[enqueue] created job", {
      jobId: job.id,
      context: payload.context,
      source: payload.source ?? null,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    // In development, await job execution to avoid fire-and-forget issues.
    await runGenerateJob(job.id, payload);
  } else {
    // In production, run in background.
    void runGenerateJob(job.id, payload);
  }

  return job.id;
}

/** Create PDF export job and run work in background. Returns jobId immediately. */
export async function enqueueExportPdf(payload: EnqueueExportPdfPayload): Promise<string> {
  const { data: job, error } = await supabaseAdmin
    .from("jobs")
    .insert({
      user_id: payload.userId,
      type: "export-pdf",
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !job) {
    logger.error("queue_enqueue_failed", { type: "export-pdf", message: error?.message });
    throw new Error(error?.message ?? "Failed to create export job");
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[enqueue] created export job", {
      jobId: job.id,
      manualId: payload.manualId,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    // In development, await job execution to avoid fire-and-forget issues.
    await runExportPdfJob(job.id, payload);
  } else {
    // In production, run in background.
    void runExportPdfJob(job.id, payload);
  }

  return job.id;
}

/** Run PDF export and update job. No sensitive data in logs. */
async function runExportPdfJob(
  jobId: string,
  payload: EnqueueExportPdfPayload
): Promise<void> {
  try {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[export job run] start", { jobId, manualId: payload.manualId });
    }
    await runExportPdfJobInner(jobId, payload);
  } catch (e) {
    const err = e as unknown;
    const message =
      err instanceof Error ? err.message : String(err ?? "PDF export failed");
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[export job run] failed", {
        jobId,
        message,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
    await markJobFailed(jobId, message);
    await trackEvent(payload.userId, "pdf_export_failed", { job_id: jobId });
  }
}

async function runExportPdfJobInner(
  jobId: string,
  payload: EnqueueExportPdfPayload
): Promise<void> {
  const { getManualById } = await import("@/lib/supabase/server");
  const { buildPdf } = await import("@/lib/pdf/renderMarkdown");
  const { auditLog } = await import("@/lib/audit");
  const { trackEvent } = await import("@/lib/events");

  await markJobRunning(jobId);

  const manual = await getManualById(payload.manualId, payload.userId);
  if (!manual) {
    await markJobFailed(jobId, "Manual not found");
    return;
  }

  // Use edited_markdown if it exists, otherwise fall back to generated content_markdown.
  const finalMarkdown = manual.edited_markdown ?? manual.content_markdown ?? "";

  if (!finalMarkdown.trim()) {
    await markJobFailed(jobId, "Manual has no content");
    return;
  }

  // Build PDF from the final markdown (respects edit overlay).
  const manualForPdf = {
    content_markdown: finalMarkdown,
    created_at: manual.created_at,
  };

  const buffer = await buildPdf(manualForPdf);

  // Guardrail: do not store oversized payloads in result_id (avoids DB bloat and failures).
  // TODO: Migrate to Supabase Storage — upload PDF to a bucket, store object path in result_id,
  // and serve via signed URL or proxy. Remove base64-in-DB approach.
  const MAX_PDF_BYTES_FOR_RESULT_ID = 2 * 1024 * 1024; // 2MB
  if (buffer.length > MAX_PDF_BYTES_FOR_RESULT_ID) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("[export job] PDF too large for result_id", {
        jobId,
        bytes: buffer.length,
        max: MAX_PDF_BYTES_FOR_RESULT_ID,
      });
    }
    await markJobFailed(
      jobId,
      "PDF is too large to store. Try shortening the manual or use Markdown export."
    );
    return;
  }

  const pdfBase64 = buffer.toString("base64");

  try {
    const { error } = await supabaseAdmin
      .from("jobs")
      .update({
        status: "completed",
        result_id: pdfBase64,
        error_message: null,
      })
      .eq("id", jobId);

    if (error) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.error("[export job] DB write failed", { jobId, message: error.message });
      }
      await markJobFailed(jobId, "Export could not be saved. Please try again.");
      return;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Export could not be saved";
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[export job] DB write exception", { jobId, message: msg });
    }
    await markJobFailed(jobId, "Export could not be saved. Please try again.");
    return;
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[export job] completed", { jobId, bytes: buffer.length });
  }

  await auditLog(payload.userId, "manual_exported", { manual_id: payload.manualId });
  await trackEvent(payload.userId, "pdf_exported", { job_id: jobId, manual_id: payload.manualId });
}

/** Run generation and update job. No sensitive data in logs. */
async function runGenerateJob(
  jobId: string,
  payload: EnqueueGeneratePayload
): Promise<void> {
  try {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[job run] start", { jobId, context: payload.context });
    }
    await runGenerateJobInner(jobId, payload);
  } catch (e) {
    const err = e as unknown;
    const message =
      err instanceof Error ? err.message : String(err ?? "Generation failed");
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[job run] failed", {
        jobId,
        message,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
    await markJobFailed(jobId, message);
    logger.generation("failure", jobId);
    logger.info("[demo] job status", { jobId, status: "failed" });
    await trackEvent(payload.userId, "manual_generation_failed", { job_id: jobId });
  }
}

async function runGenerateJobInner(
  jobId: string,
  payload: EnqueueGeneratePayload
): Promise<void> {
  const { generateManualMarkdown } = await import("@/lib/ai/generate");
  const { auditLog } = await import("@/lib/audit");

  const answers = payload.answers;
  if (!answers || Object.keys(answers).length === 0) {
    await markJobFailed(jobId, "Demo answers were empty. Seed data is missing.");
    return;
  }
  await markJobRunning(jobId);

  const { markdown, valid, error: generationError } = await generateManualMarkdown(
    answers,
    payload.context,
    payload.source
  );
  if (!valid) {
    if (payload.source === "demo") {
      const msg = generationError ?? "Demo validation failed";
      // eslint-disable-next-line no-console
      console.error("[job run] demo invalid", { jobId, msg });
      await markJobFailed(jobId, msg);
    } else {
      await markJobFailed(jobId, "Validation failed");
    }
    return;
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[job run] generated markdown", {
      jobId,
      hasMarkdown: typeof markdown === "string" && markdown.length > 0,
    });
  }

  const { data: existingManuals } = await supabaseAdmin
    .from("manuals")
    .select("id, version, family_id")
    .eq("response_id", payload.responseId)
    .eq("user_id", payload.userId)
    .eq("context", payload.context)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  let nextVersion = 1;
  let familyId: string | null = null;

  if (existingManuals && existingManuals.length > 0) {
    const existing = existingManuals[0] as {
      id: string;
      version?: number | null;
      family_id?: string | null;
    };
    nextVersion = existing.version && existing.version > 0 ? existing.version + 1 : 1;
    familyId = existing.family_id ?? null;

    // Lazily backfill family_id for older manuals that don't have it yet.
    if (!familyId) {
      familyId = randomUUID();
      await supabaseAdmin
        .from("manuals")
        .update({ family_id: familyId })
        .eq("id", existing.id);
    }
  } else {
    familyId = randomUUID();
  }

  const { data: manual, error } = await supabaseAdmin
    .from("manuals")
    .insert({
      user_id: payload.userId,
      response_id: payload.responseId,
      context: payload.context,
      version: nextVersion,
      family_id: familyId,
      answers_snapshot: answers,
      content_markdown: markdown,
    })
    .select("id")
    .single();

  if (error || !manual) {
    const msg =
      error?.message?.includes("answers_snapshot") ||
      error?.message?.includes("schema cache")
        ? "DB schema is missing required columns. Run the Step 2 migration in Supabase: add manuals.answers_snapshot (jsonb) and manuals.family_id (uuid), then reload schema."
        : error?.message ?? "Failed to save";
    await markJobFailed(jobId, msg);
    if (
      error?.message?.includes("answers_snapshot") ||
      error?.message?.includes("schema cache")
    ) {
      logger.generation("failure", jobId);
      logger.info("schema_missing_answers_snapshot", { jobId });
    }
    return;
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[job run] inserted manual", { jobId, manualId: manual.id });
  }

  await auditLog(payload.userId, "manual_created", {
    manual_id: manual.id,
    response_id: payload.responseId,
    context: payload.context,
    version: nextVersion,
  });

  await supabaseAdmin
    .from("jobs")
    .update({ status: "completed", result_id: manual.id, error_message: null })
    .eq("id", jobId);
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[job] completed", { jobId, manualId: manual.id });
  }

  logger.generation("success", jobId);
  logger.info("[demo] job status", { jobId, status: "completed" });
  await trackEvent(payload.userId, "manual_generation_completed", {
    job_id: jobId,
    manual_id: manual.id,
  });
}

async function markJobFailed(jobId: string, errorMessage: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("jobs")
    .update({ status: "failed", error_message: errorMessage })
    .eq("id", jobId);
  if (error && process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.error("[job] failed update error", { jobId, message: error.message });
  }
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[job] failed", { jobId, msg: errorMessage });
  }
}

async function markJobRunning(jobId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("jobs")
    .update({ status: "running", error_message: null })
    .eq("id", jobId);
  if (error && process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.error("[job] running update error", { jobId, message: error.message });
  }
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[job] running", { jobId });
  }
}

/** Get job status for polling. Ownership enforced by caller. */
export async function getJobStatus(
  jobId: string,
  userId: string
): Promise<{ status: JobStatus; manualId?: string; error?: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("status, result_id, error_message, user_id")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return {
    status: data.status as JobStatus,
    manualId: data.result_id ?? undefined,
    error: data.error_message ?? undefined,
  };
}
