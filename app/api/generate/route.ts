import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getResponseById, supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/authorization";
import { checkRateLimit } from "@/lib/rate-limit";
import { enqueueGenerate } from "@/lib/queue";
import { logger } from "@/lib/logger";
import { trackEvent } from "@/lib/events";

// Ownership: getResponseById only returns the response when user_id = currentUserId; else 404.

/**
 * POST: enqueue manual generation. Returns 202 with jobId; client polls GET /api/generate/status?jobId=...
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await checkRateLimit("generate", userId);
  if (!limit.success) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "OpenAI is not configured. Add OPENAI_API_KEY to .env.local and restart the dev server.",
      },
      { status: 503 }
    );
  }

  const { generateBodySchema } = await import("@/lib/api-schemas");
  const parsed = generateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { context: rawContext, responseId: bodyResponseId, manualId, source } = parsed.data;
  const isDemo = source === "demo";

  // Manual-based regeneration: prefer answers_snapshot, fall back to response row.
  if (manualId) {
    const { data: manual } = await supabaseAdmin
      .from("manuals")
      .select("id, user_id, response_id, context, answers_snapshot, deleted_at")
      .eq("id", manualId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    const ownerErr = requireOwner(userId, manual?.user_id);
    if (ownerErr || !manual) {
      return NextResponse.json({ error: "Manual not found" }, { status: 404 });
    }

    const effectiveContext = (manual.context ?? rawContext) as "general" | "work" | "partner";
    const responseId = manual.response_id as string;
    let answers: Record<string, string> | null = null;

    if (manual.answers_snapshot) {
      answers = manual.answers_snapshot as Record<string, string>;
    } else {
      const response = await getResponseById(responseId, userId);
      const responseOwnerErr = requireOwner(userId, response?.user_id);
      if (responseOwnerErr || !response) {
        return NextResponse.json(
          {
            error:
              "This manual can’t be regenerated because the original answers are missing. Please retake the questionnaire.",
          },
          { status: 400 }
        );
      }
      answers = response.answers as Record<string, string>;
    }

    const answersCount = answers ? Object.keys(answers).length : 0;
    if (isDemo && process.env.NODE_ENV === "development") {
      // Safe dev-only log: key count only, no content.
      // eslint-disable-next-line no-console
      console.log("[demo] answers snapshot", { keysCount: answersCount });
    }

    if (!answers || answersCount === 0) {
      return NextResponse.json(
        {
          error:
            "This manual can’t be regenerated because the original answers are missing. Please retake the questionnaire.",
        },
        { status: 400 }
      );
    }

    try {
      const jobId = await enqueueGenerate({
        userId,
        responseId,
        context: effectiveContext,
        answers,
        source: isDemo ? "demo" : undefined,
      });
      logger.generation("success", jobId);
      if (isDemo) {
        logger.info("[demo] generate enqueue", {
          jobId,
          context: effectiveContext,
          hasAnswersSnapshot: answersCount > 0,
          source: "demo",
        });
      }
      await trackEvent(userId, "manual_generation_started", { job_id: jobId, response_id: responseId });
      return NextResponse.json({ jobId }, { status: 202 });
    } catch {
      logger.generation("failure");
      return NextResponse.json(
        { error: "Generation could not be started. Please try again." },
        { status: 500 }
      );
    }
  }

  // Default path: generate from questionnaire response (existing behavior).
  let responseId = bodyResponseId;

  if (!responseId) {
    const { data: latest } = await supabaseAdmin
      .from("responses")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    responseId = latest?.id;
  }

  if (!responseId) {
    return NextResponse.json(
      {
        error:
          "No answers found. Complete the questionnaire from the first step, then use “Convert to manual” on the last step.",
      },
      { status: 400 }
    );
  }

  const response = await getResponseById(responseId, userId);
  const ownerErr = requireOwner(userId, response?.user_id);
  if (process.env.NODE_ENV === "development") {
    console.log("[generate POST]", { userId, responseId, found: !!response, ownerErr: !!ownerErr });
  }
  if (ownerErr) {
    return NextResponse.json(
      {
        error:
          "Response not found. Complete the questionnaire again or open a manual that was just created.",
      },
      { status: 404 }
    );
  }

  const answers = response!.answers as Record<string, string>;
  const answersCount = answers ? Object.keys(answers).length : 0;
  if (isDemo && process.env.NODE_ENV === "development") {
    // Safe dev-only log: key count only, no content.
    // eslint-disable-next-line no-console
    console.log("[demo] answers snapshot", { keysCount: answersCount });
  }

  if (!answers || answersCount === 0) {
    return NextResponse.json(
      {
        error:
          "This set of answers is empty. Complete the questionnaire and click “Convert to manual” from the last step.",
      },
      { status: 400 }
    );
  }

  try {
    const jobId = await enqueueGenerate({
      userId,
      responseId,
      context: rawContext,
      answers,
      source: isDemo ? "demo" : undefined,
    });
    logger.generation("success", jobId);
    if (isDemo) {
      logger.info("[demo] generate enqueue", {
        jobId,
        context: rawContext,
        hasAnswersSnapshot: answersCount > 0,
        source: "demo",
      });
    }
    await trackEvent(userId, "manual_generation_started", { job_id: jobId, response_id: responseId });
    return NextResponse.json({ jobId }, { status: 202 });
  } catch {
    logger.generation("failure");
    return NextResponse.json(
      { error: "Generation could not be started. Please try again." },
      { status: 500 }
    );
  }
}
