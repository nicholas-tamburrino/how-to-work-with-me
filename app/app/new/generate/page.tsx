"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  MutedText,
  SectionDivider,
  SectionTitle,
  Stack,
} from "@/components/ui";

type Context = "general" | "work" | "partner";

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const responseIdFromUrl = searchParams.get("responseId");
  const [context, setContext] = useState<Context>("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<
    "idle" | "queued" | "running" | "completed" | "failed" | "unknown"
  >("idle");
  const [jobError, setJobError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setJobError(null);
    setJobId(null);
    setJobStatus("idle");
    try {
      const body: { context: Context; responseId?: string } = { context };
      if (responseIdFromUrl) body.responseId = responseIdFromUrl;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      if (res.status === 202 && data.jobId) {
        setJobId(data.jobId);
        setJobStatus("queued");
        const result = await pollJobStatus(data.jobId);
        if (result.manualId) {
          router.push(`/app/manual/${result.manualId}`);
          return;
        }
        const msg = result.error ?? "Generation didn't complete. Please try again.";
        setError(msg);
        if (result.errorCode) setErrorCode(result.errorCode);
        return;
      }
      if (data.manualId) router.push(`/app/manual/${data.manualId}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  async function pollJobStatus(
    jobId: string
  ): Promise<{ manualId?: string; error?: string; errorCode?: string }> {
    const isDev = process.env.NODE_ENV === "development";
    const maxAttempts = isDev ? 60 : 40;
    const intervalMs = 1500;
    let notFoundRetries = 0;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const res = await fetch(`/api/generate/status?jobId=${jobId}`);
      if (res.status === 404) {
        if (notFoundRetries < 5) {
          notFoundRetries += 1;
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.log("[poll] status 404 retry", { jobId, attempt: notFoundRetries });
          }
          continue;
        }
        const msg = "Job not found. Please try again.";
        setJobStatus("unknown");
        setJobError(msg);
        return { error: msg };
      }
      const data = await res.json();
      if (data.status === "completed" && data.manualId) {
        setJobStatus("completed");
        return { manualId: data.manualId };
      }
      if (data.status === "failed") {
        setJobStatus("failed");
        const msg = data.error ?? "Generation failed";
        setJobError(msg);
        return {
          error: msg,
          errorCode: data.errorCode ?? undefined,
        };
      }
      if (data.status === "pending") {
        setJobStatus("queued");
      }
      if (data.status === "running") {
        setJobStatus("running");
      }
    }
    const timeoutMsg = "Generation timed out. Please try again.";
    setJobStatus("unknown");
    setJobError(timeoutMsg);
    return { error: timeoutMsg };
  }

  return (
    <div className="max-w-xl mx-auto">
      <Stack>
        <div className="space-y-3">
          <Link
            href="/app/new"
            className="text-sm text-mute hover:text-ink transition-colors"
          >
            ← Back to questionnaire
          </Link>
          <div className="space-y-2">
            <Badge tone="muted">STEP 2 · CONTEXT</Badge>
            <h1 className="text-2xl font-semibold text-ink">Convert into a manual</h1>
            <MutedText>
              Choose who this version is for. Your answers stay the same; only the framing
              changes.
            </MutedText>
          </div>
          {responseIdFromUrl && (
            <MutedText className="text-emerald-700">
              Your answers are saved. You&apos;re ready to generate.
            </MutedText>
          )}
          {!responseIdFromUrl && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-900">
              You didn&apos;t come from the questionnaire.{" "}
              <Link href="/app/new" className="font-medium underline">
                Complete the questions first
              </Link>{" "}
              and then use &quot;Convert to manual&quot; on the last step.
            </div>
          )}
        </div>

        <Card className="shadow-[0_16px_36px_rgba(15,23,42,0.04)]">
          <CardHeader className="pb-3">
            <CardTitle>Who is this manual for?</CardTitle>
            <MutedText className="mt-1">
              You can create different versions later — for work, partners, or other
              contexts.
            </MutedText>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {(["general", "work", "partner"] as const).map((c) => {
                const isActive = context === c;
                const label =
                  c === "general" ? "General" : c === "work" ? "Work" : "Partner";
                const description =
                  c === "general"
                    ? "Covers both work and life. A good starting point."
                    : c === "work"
                    ? "For teammates, managers, and collaborators at work."
                    : "For the person you share life with outside of work.";
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setContext(c)}
                    className={`flex h-full flex-col items-start rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      isActive
                        ? "border-accent bg-accent/5 text-ink"
                        : "border-neutral-200 bg-white/70 text-ink hover:border-neutral-300"
                    }`}
                  >
                    <span className="mb-1 font-semibold">{label}</span>
                    <MutedText>{description}</MutedText>
                  </button>
                );
              })}
            </div>
            <MutedText className="text-xs">
              You can always regenerate a new version later with a different context.
            </MutedText>
          </CardBody>
        </Card>

        {loading && (
          <Card className="glass border-none">
            <CardBody className="space-y-4">
              <Badge tone="muted">WRITING YOUR GUIDE</Badge>
              <SectionTitle>Creating your manual…</SectionTitle>
              <MutedText>
                We’re turning your answers into a clear, readable guide. This usually
                takes under a minute. You’ll be taken to your manual as soon as it’s
                ready — no need to refresh.
              </MutedText>
              <div className="flex items-center gap-3">
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/80 to-transparent [animation:shimmer_1.4s_infinite]" />
                </div>
                <span className="text-xs text-mute shrink-0">
                  {jobStatus === "running"
                    ? "Writing sections…"
                    : jobStatus === "queued"
                      ? "In queue…"
                      : "Shaping your guide…"}
                </span>
              </div>
              <div className="space-y-3 pt-1">
                <div className="h-6 w-40 rounded-full bg-neutral-200/80 overflow-hidden relative">
                  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent [animation:shimmer_1.6s_infinite]" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full rounded-md bg-neutral-200/80 overflow-hidden relative">
                    <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent [animation:shimmer_1.8s_infinite]" />
                  </div>
                  <div className="h-4 w-11/12 rounded-md bg-neutral-200/80 overflow-hidden relative">
                    <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent [animation:shimmer_2s_infinite]" />
                  </div>
                  <div className="h-4 w-3/4 rounded-md bg-neutral-200/80 overflow-hidden relative">
                    <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent [animation:shimmer_2.2s_infinite]" />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {(error || jobError) && (
          <Card className="border-red-100 bg-red-50/95">
            <CardBody className="space-y-3 text-sm text-red-900">
              <div className="flex flex-wrap items-start gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <SectionTitle className="text-sm font-semibold text-red-900">
                    We couldn&apos;t finish your manual
                  </SectionTitle>
                  {error && <p>{error}</p>}
                  {jobError && <p>{jobError}</p>}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setErrorCode(null);
                    setJobError(null);
                    void handleGenerate();
                  }}
                  className="border-red-200 bg-red-100/80 text-red-900 hover:bg-red-100 focus-ring-accent"
                >
                  Try again
                </Button>
              </div>
              {errorCode === "openai_401" && (
                <p className="text-xs text-red-800">
                  Check that your OpenAI API key is set correctly in the environment
                  variables.
                </p>
              )}
            </CardBody>
          </Card>
        )}

        <SectionDivider className="pt-0" />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className={loading ? "" : "elevate-hover focus-ring-accent"}
          >
            {loading ? "Generating… this may take a minute" : "Generate manual"}
          </Button>
          <ButtonLink
            href="/app/new"
            variant="secondary"
            className="border-neutral-200"
          >
            Back to questionnaire
          </ButtonLink>
        </div>

        {jobId && (
          <Card className="border-neutral-200 bg-neutral-50/70">
            <CardBody className="space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">Background job</span>
                <Badge tone="muted">{jobStatus}</Badge>
              </div>
              <p className="break-all text-mute">
                <span className="font-mono text-[11px]">jobId:</span> {jobId}
              </p>
            </CardBody>
          </Card>
        )}
      </Stack>
    </div>
  );
}
