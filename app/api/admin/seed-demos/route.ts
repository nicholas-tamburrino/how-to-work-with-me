import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getDemoAnswers } from "@/lib/demo-seed";
import { enqueueGenerate } from "@/lib/queue";

const SEED_COUNT = 3;
const CONTEXTS = ["general", "work", "partner"] as const;

/**
 * POST: seed multiple demo manuals for the current user. Admin only.
 * Creates one response with demo answers, then enqueues SEED_COUNT generations (one per context).
 * Use for testing dashboard list and manual viewer.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const answers = getDemoAnswers();
  const { data: response, error: insertError } = await supabaseAdmin
    .from("responses")
    .insert({ user_id: userId, answers })
    .select("id")
    .single();

  if (insertError || !response) {
    return NextResponse.json({ error: "Failed to create response" }, { status: 500 });
  }

  const jobIds: string[] = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    try {
      const jobId = await enqueueGenerate({
        userId,
        responseId: response.id,
        context: CONTEXTS[i % CONTEXTS.length],
        answers,
      });
      jobIds.push(jobId);
    } catch {
      // continue with rest
    }
  }

  return NextResponse.json({
    ok: true,
    responseId: response.id,
    jobIds,
    message: `Seeded ${jobIds.length} demo generations. Refresh the dashboard in a minute to see new manuals.`,
  });
}
