"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDemoAnswers } from "@/lib/demo-seed";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  MutedText,
  SectionDivider,
  Stack,
} from "@/components/ui";

async function trackDemoUsed() {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName: "demo_used" }),
    });
  } catch {
    // ignore
  }
}

/**
 * Demo mode: creates sample answers and generates a demo manual for the current user.
 * Uses the same /api/responses and /api/generate flow, so validation and audit logging apply.
 * For live presentations only.
 */
export default function DemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<
    "idle" | "queued" | "running" | "completed" | "failed" | "unknown"
  >("idle");
  const [jobError, setJobError] = useState<string | null>(null);
  const [guidedMode, setGuidedMode] = useState(false);
  const [guidedStep, setGuidedStep] = useState(0);
  const [guidedAnswers, setGuidedAnswers] = useState<Record<string, string>>({});

  const GUIDED_QUESTIONS: { key: string; title: string; prompt: string }[] = [
    {
      key: "comm_what_works",
      title: "What works best when people communicate with you?",
      prompt: "Share how you like others to approach you, ask for things, or share updates.",
    },
    {
      key: "comm_frustrates",
      title: "What tends to frustrate you in communication?",
      prompt: "Mention patterns that make it harder for you to stay focused or feel heard.",
    },
    {
      key: "comm_respond",
      title: "How do you usually respond to messages and requests?",
      prompt: "Describe your response speed, preferred channels, and any expectations to set.",
    },
    {
      key: "decide_how",
      title: "How do you prefer to make decisions?",
      prompt: "Explain what helps you choose a direction and feel confident in a decision.",
    },
    {
      key: "stress_helps",
      title: "What helps when you’re stressed or overloaded?",
      prompt: "Share specific things others can do that genuinely help you reset.",
    },
  ];

  async function pollJobStatus(
    id: string
  ): Promise<{ manualId?: string; status: string; error?: string }> {
    const isDev = process.env.NODE_ENV === "development";
    const maxAttempts = isDev ? 60 : 40; // ~90s in dev, ~60s elsewhere
    const intervalMs = 1500;
    let notFoundRetries = 0;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const res = await fetch(`/api/generate/status?jobId=${id}`);
      if (res.status === 404) {
        if (notFoundRetries < 5) {
          notFoundRetries += 1;
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.log("[poll] status 404 retry", { jobId: id, attempt: notFoundRetries });
          }
          continue;
        }
        setJobStatus("unknown");
        setJobError("Job not found. Please try again.");
        return { status: "failed", error: "Job not found" };
      }
      const data = await res.json();
      if (data.status === "completed" && data.manualId) {
        setJobStatus("completed");
        return { manualId: data.manualId, status: "completed" };
      }
      if (data.status === "failed") {
        setJobStatus("failed");
        setJobError(data.error ?? "Generation failed");
        return { status: "failed", error: data.error };
      }
      if (data.status === "pending") {
        setJobStatus("queued");
      }
      if (data.status === "running") {
        setJobStatus("running");
      }
    }
    setJobStatus("unknown");
    setJobError("Generation timed out. Please try again.");
    return { status: "unknown", error: "Generation timed out. Please try again." };
  }

  async function generateDemoFromAnswers(answers: Record<string, string>) {
    setLoading(true);
    setError(null);
    setJobError(null);
    setJobId(null);
    setJobStatus("idle");
    await trackDemoUsed();
    try {
      const createRes = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.responseId) {
        setError(createData.error ?? "Failed to create demo answers");
        return;
      }
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId: createData.responseId,
          context: "general",
          source: "demo",
        }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) {
        setError(genData.error ?? "Failed to generate demo manual");
        return;
      }
      let manualId: string | undefined = genData.manualId;
      if (genRes.status === 202 && genData.jobId) {
        setJobId(genData.jobId);
        setJobStatus("queued");
        const result = await pollJobStatus(genData.jobId);
        manualId = result.manualId;
      }
      if (manualId) {
        router.push(`/app/manual/${manualId}`);
        return;
      }
      setError("Demo generation didn’t complete. Please try again.");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const runDemo = async () => {
    const answers = getDemoAnswers();
    await generateDemoFromAnswers(answers);
  };

  const runGuidedDemo = async () => {
    setLoading(true);
    setError(null);
    setJobError(null);
    setJobId(null);
    setJobStatus("idle");
    await trackDemoUsed();

    const baseAnswers = getDemoAnswers();
    const merged: Record<string, string> = { ...baseAnswers };
    let filled = 0;
    for (const q of GUIDED_QUESTIONS) {
      const raw = guidedAnswers[q.key];
      const value = raw?.trim();
      if (value) {
        merged[q.key] = value;
        filled += 1;
      }
    }

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[guided demo] submit", { filled, stepIndex: guidedStep });
    }

    try {
      const createRes = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: merged }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.responseId) {
        setError(createData.error ?? "Failed to create demo answers");
        return;
      }

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[guided demo] created response", { responseId: createData.responseId });
      }

      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId: createData.responseId as string,
          context: "general",
          source: "demo",
        }),
      });
      const genData = await genRes.json();

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[guided demo] generate accepted", {
          status: genRes.status,
          jobId: genData.jobId ?? null,
          manualId: genData.manualId ?? null,
        });
      }

      if (!genRes.ok) {
        setError(genData.error ?? "Failed to generate demo manual");
        return;
      }

      let manualId: string | undefined = genData.manualId;
      if (genRes.status === 202 && genData.jobId) {
        setJobId(genData.jobId);
        setJobStatus("queued");
        const result = await pollJobStatus(genData.jobId);
        manualId = result.manualId;
      }
      if (manualId) {
        router.push(`/app/manual/${manualId}`);
        return;
      }
      setError("Demo generation didn’t complete. Please try again.");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Stack>
        <div className="space-y-3">
          <Link href="/app" className="text-sm text-mute hover:text-ink">
            ← Dashboard
          </Link>
          <div className="space-y-2">
            <Badge tone="muted">DEMO</Badge>
            <h1 className="text-2xl font-semibold text-ink">Demo mode</h1>
            <MutedText>
              Create sample answers and generate an instant, presentation-ready demo
              manual. Uses the same validation and audit logging as the real flow.
            </MutedText>
          </div>
        </div>

        {/* Demo preview / explanation */}
        <Card className="border-neutral-200 bg-white/80">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge tone="muted">Instant</Badge>
              <Badge tone="muted">Presentation Ready</Badge>
            </div>
            <CardTitle className="mt-3">Instant Demo Manual</CardTitle>
            <MutedText className="mt-1">
              This demo generates a short, bullet-style &quot;How To Work With Me&quot; manual
              using curated sample answers. It&apos;s designed to show structure, tone, and
              formatting — not personal content.
            </MutedText>
          </CardHeader>
        </Card>

        {/* Mode selection */}
        <Card className="border-neutral-200 bg-white/90">
          <CardHeader className="pb-3">
            <CardTitle>Choose how to run the demo</CardTitle>
            <MutedText className="mt-1">
              Use the instant option for a one-click walkthrough, or answer five quick prompts to
              experience a guided version of the flow.
            </MutedText>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={runDemo}
                disabled={loading}
                className="flex h-full flex-col items-start rounded-xl border border-neutral-200 bg-white/90 px-4 py-3 text-left text-sm hover:border-accent/70 transition-colors"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    Recommended
                  </span>
                </div>
                <p className="font-semibold text-ink">Instant demo</p>
                <MutedText className="mt-1">
                  One click seeds sample answers and generates a polished demo manual.
                </MutedText>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGuidedMode(true);
                  setGuidedStep(0);
                }}
                className="flex h-full flex-col items-start rounded-xl border border-neutral-200 bg-white/90 px-4 py-3 text-left text-sm hover:border-accent/70 transition-colors"
              >
                <p className="font-semibold text-ink">Guided demo (5 questions)</p>
                <MutedText className="mt-1">
                  Answer a few short prompts and then generate a demo manual from your sample
                  responses.
                </MutedText>
              </button>
            </div>
          </CardBody>
        </Card>

        {guidedMode && (
          <Card className="border-neutral-200 bg-white/90">
            <CardHeader className="pb-2">
              <CardTitle>Guided demo (5 questions)</CardTitle>
              <MutedText className="mt-1">
                Short answers are fine. You can always reset and start again.
              </MutedText>
            </CardHeader>
            <CardBody className="space-y-4">
              {(() => {
                const current = GUIDED_QUESTIONS[guidedStep];
                const total = GUIDED_QUESTIONS.length;
                const isLastStep = guidedStep === total - 1;
                const allFilled = GUIDED_QUESTIONS.every(
                  (q) => (guidedAnswers[q.key]?.trim() ?? "").length > 0
                );
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-mute">
                      <span className="font-medium text-ink text-sm">
                        Question {guidedStep + 1} of {total}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-ink">{current.title}</p>
                      <MutedText className="text-xs">{current.prompt}</MutedText>
                      <textarea
                        className="mt-2 w-full rounded-lg border border-neutral-200 bg-white/90 px-3 py-2 text-sm text-ink shadow-sm focus-ring-accent"
                        rows={4}
                        value={guidedAnswers[current.key] ?? ""}
                        onChange={(e) =>
                          setGuidedAnswers((prev) => ({
                            ...prev,
                            [current.key]: e.target.value,
                          }))
                        }
                        placeholder="Write a short answer in your own words."
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (guidedStep === 0) {
                            setGuidedMode(false);
                          } else {
                            setGuidedStep((s) => Math.max(0, s - 1));
                          }
                        }}
                        className="text-xs text-mute hover:text-ink underline-offset-2 hover:underline"
                      >
                        {guidedStep === 0 ? "Back to demo options" : "Back"}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setGuidedMode(false);
                            setGuidedStep(0);
                            setGuidedAnswers({});
                          }}
                          className="text-xs text-mute hover:text-ink underline-offset-2 hover:underline"
                        >
                          Reset guided demo
                        </button>
                        <Button
                          type="button"
                          onClick={() => {
                            if (!isLastStep) {
                              setGuidedStep((s) => Math.min(total - 1, s + 1));
                            } else {
                              void runGuidedDemo();
                            }
                          }}
                          disabled={loading || (isLastStep && !allFilled)}
                          size="sm"
                          className="elevate-hover focus-ring-accent"
                        >
                          {!isLastStep
                            ? "Next question"
                            : loading
                            ? "Creating demo…"
                            : "Generate guided demo manual"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardBody>
          </Card>
        )}

        {(error || jobError) && (
          <Card className="border-red-200 bg-red-50/95">
            <CardBody className="space-y-3 text-sm text-red-900">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Demo generation failed</h2>
                {error && <p>{error}</p>}
                {jobError && <p>{jobError}</p>}
              </div>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={runDemo}
                  className="border-red-200 bg-red-100/80 text-red-900 hover:bg-red-100"
                >
                  Retry demo
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="border-neutral-200 bg-white/90">
          <CardHeader className="pb-3">
            <CardTitle>Run demo generation</CardTitle>
            <MutedText className="mt-1">
              One click seeds answers, runs validation, and builds a demo manual in seconds.
            </MutedText>
          </CardHeader>
          <CardBody className="space-y-4">
            <Button type="button" onClick={runDemo} disabled={loading}>
              {loading ? "Creating demo…" : "Create demo manual"}
            </Button>
            <MutedText className="text-xs">
              No personal data is used. Demo content is fully synthetic.
            </MutedText>
            {jobId && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 text-xs space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">Background job</span>
                  <Badge tone="muted">{jobStatus}</Badge>
                </div>
                <p className="break-all text-mute">
                  <span className="font-mono text-[11px]">jobId:</span> {jobId}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="border-neutral-200 bg-neutral-50/70">
          <CardBody className="space-y-2 text-xs text-mute">
            <p className="font-medium text-ink text-sm">
              What happens during demo generation?
            </p>
            <ul className="space-y-1 list-disc pl-4">
              <li>Sample answers are seeded for this account only.</li>
              <li>A background job validates structure and formatting.</li>
              <li>A formatted demo manual is created from the seeded answers.</li>
              <li>You are redirected automatically once the manual is ready.</li>
            </ul>
          </CardBody>
        </Card>

        <SectionDivider />

        <MutedText className="text-xs">
          For live presentations only. Demo content is synthetic and never uses real
          answers.
        </MutedText>
      </Stack>
    </div>
  );
}
