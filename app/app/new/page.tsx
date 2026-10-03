"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { QUESTIONS, QUESTION_IDS } from "@/lib/questions";
import type { AnswersMap } from "@/lib/types";
import { useToast } from "@/components/Toast";
import {
  Badge,
  Button,
  InfoCallout,
  MutedText,
  SectionDivider,
  SectionTitle,
  Stack,
} from "@/components/ui";

const TOTAL = QUESTIONS.length;
const DEBOUNCE_MS = 1200;
const DRAFT_KEY = "htwwm_questionnaire_draft";
const DRAFT_DEBOUNCE_MS = 400;
const SAVE_404_BACKOFF_MS = 15000;

type SaveResult = { responseId?: string; error?: string };

function loadDraft(): AnswersMap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: AnswersMap = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof k === "string" && typeof v === "string") out[k] = v;
      }
      return Object.keys(out).length > 0 ? out : null;
    }
  } catch {
    // ignore
  }
  return null;
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function saveDraft(answers: AnswersMap): void {
  if (Object.keys(answers).length === 0) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
  } catch {
    // ignore
  }
}

export default function QuestionnairePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [responseId, setResponseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  const responseIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inProgressRef = useRef(false);
  const pendingPayloadRef = useRef<AnswersMap | null>(null);
  const pendingResolveRef = useRef<((r: SaveResult) => void) | null>(null);
  const userHasEditedRef = useRef(false);
  const lastSavedAnswersRef = useRef<AnswersMap>({});
  const answersRef = useRef<AnswersMap>({});
  const backoffUntilMsRef = useRef(0);
  const toast404ShownRef = useRef(false);
  const toast = useToast();

  useEffect(() => {
    responseIdRef.current = responseId;
  }, [responseId]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const question = QUESTIONS[step];
  const progress = TOTAL > 0 ? ((step + 1) / TOTAL) * 100 : 0;

  const performSave = useCallback(async (payload: AnswersMap): Promise<SaveResult> => {
    const res = await fetch(api("/api/responses"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responseId: responseIdRef.current ?? undefined,
        answers: payload,
      }),
    });
    if (res.status === 404) {
      backoffUntilMsRef.current = Date.now() + SAVE_404_BACKOFF_MS;
      if (!toast404ShownRef.current) {
        toast404ShownRef.current = true;
        toast.info("Saving unavailable, retrying…");
      }
      return { error: "Saving unavailable" };
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error ?? `Save failed (${res.status})`;
      setSaveError(msg);
      return { error: msg };
    }
    toast404ShownRef.current = false;
    if (data.responseId) {
      responseIdRef.current = data.responseId;
      setResponseId(data.responseId);
    }
    setSaveError(null);
    lastSavedAnswersRef.current = payload;
    clearDraft();
    return { responseId: data.responseId };
  }, [toast]);

  const save = useCallback(async (payload: AnswersMap): Promise<SaveResult> => {
    if (Date.now() < backoffUntilMsRef.current) {
      return { error: "Saving temporarily unavailable. Please try again in a moment." };
    }
    if (inProgressRef.current) {
      pendingPayloadRef.current = payload;
      return new Promise<SaveResult>((resolve) => {
        pendingResolveRef.current = resolve;
      });
    }
    inProgressRef.current = true;
    setSaving(true);
    try {
      const result = await performSave(payload);
      if (pendingPayloadRef.current) {
        const next = pendingPayloadRef.current;
        pendingPayloadRef.current = null;
        const resolve = pendingResolveRef.current;
        pendingResolveRef.current = null;
        const nextResult = await save(next);
        resolve?.(nextResult);
        return nextResult;
      }
      return result;
    } catch {
      const msg = "Network error. Check your connection and try again.";
      setSaveError(msg);
      return { error: msg };
    } finally {
      inProgressRef.current = false;
      setSaving(false);
    }
  }, [performSave]);

  const loadResponses = useCallback(() => {
    setLoadError(null);
    setLoaded(false);
    setDraftRestored(false);
    fetch(api("/api/responses"))
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setLoadError(data?.error ?? "Failed to load");
          return;
        }
        const serverAnswers = (data.answers as AnswersMap) ?? {};
        const hasServerData = serverAnswers && Object.keys(serverAnswers).length > 0;
        if (hasServerData) {
          setAnswers(serverAnswers);
          lastSavedAnswersRef.current = serverAnswers;
          clearDraft();
        } else {
          const draft = loadDraft();
          if (draft && Object.keys(draft).length > 0) {
            setAnswers(draft);
            setDraftRestored(true);
            lastSavedAnswersRef.current = {};
          } else {
            setAnswers({});
            lastSavedAnswersRef.current = {};
          }
        }
        if (data.responseId) {
          setResponseId(data.responseId);
          responseIdRef.current = data.responseId;
        }
      })
      .catch(() => setLoadError("Network error. Refresh the page to try again."))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  useEffect(() => {
    if (!loaded || Object.keys(answers).length === 0) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      draftTimerRef.current = null;
      saveDraft(answers);
    }, DRAFT_DEBOUNCE_MS);
    return () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
    };
  }, [answers, loaded]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const current = answersRef.current;
      const last = lastSavedAnswersRef.current;
      const hasUnsaved =
        JSON.stringify(current) !== JSON.stringify(last) ||
        saveTimerRef.current !== null ||
        inProgressRef.current;
      if (hasUnsaved) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    if (!loaded || !userHasEditedRef.current || Object.keys(answers).length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void save(answers);
    }, DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [answers, loaded, save]);

  const flushSave = useCallback((): Promise<SaveResult> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    return save(answers);
  }, [answers, save]);

  const handleChange = (value: string) => {
    if (!question) return;
    userHasEditedRef.current = true;
    setSaveError(null);
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
  };

  const handleNext = async () => {
    if (step >= TOTAL - 1) return;
    await flushSave();
    setStep(step + 1);
  };

  const handleBack = async () => {
    if (step <= 0) return;
    await flushSave();
    setStep(step - 1);
  };

  const canGenerate = QUESTION_IDS.every((id) => (answers[id] ?? "").trim().length > 0);

  const handleGoToGenerate = async () => {
    if (!canGenerate) return;
    setSaveError(null);
    const result = await flushSave();
    const rid = result.responseId ?? responseIdRef.current ?? responseId;
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    if (!rid) {
      setSaveError("Answers could not be saved. Please try again.");
      return;
    }
    router.push(`/app/new/generate?responseId=${rid}`);
  };

  if (!loaded) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center text-mute">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Stack>
        <div className="space-y-3">
          <Link
            href="/app"
            className="text-sm text-mute hover:text-ink hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded ring-offset-surface"
          >
            ← Dashboard
          </Link>
          <div className="space-y-2">
            <Badge tone="muted">QUESTIONNAIRE</Badge>
            <h1 className="font-display text-2xl font-semibold text-ink tracking-tight">Create your manual</h1>
            <MutedText>
              One question at a time. Your answers auto‑save as you go.
            </MutedText>
          </div>
        </div>

        {loadError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => loadResponses()}
              className="mt-2 text-xs font-semibold underline underline-offset-4"
            >
              Retry loading answers
            </button>
          </div>
        )}

        {saveError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50/90 p-4 text-sm text-red-900">
            <span>We couldn&apos;t save your latest changes.</span>
            <button
              type="button"
              onClick={() => save(answers)}
              disabled={saving}
              className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Retry save"}
            </button>
          </div>
        )}

        {draftRestored && (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <InfoCallout variant="success" title="Draft restored" className="flex-1 min-w-0">
              <p>Continue below — answers auto-save as you go.</p>
            </InfoCallout>
            <button
              type="button"
              onClick={() => setDraftRestored(false)}
              className="text-sm text-success-700 hover:text-success-800 underline underline-offset-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-mute">
            <span>
              Step {step + 1} of {TOTAL}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {question && (
          <section className="space-y-4 rounded-xl border border-token bg-surface-2 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] motion-safe-fade-up">
            <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-mute-2">
              {question.topic}
            </p>
            <SectionTitle>{question.text}</SectionTitle>
            <p className="text-[15px] leading-6 text-mute">
              Use your own words. Short bullets or a few sentences are both fine.
            </p>
            <textarea
              value={answers[question.id] ?? ""}
              onChange={(e) => handleChange(e.target.value)}
              onInput={(e) => {
                const target = e.currentTarget;
                target.style.height = "auto";
                const maxHeight = 320;
                const next = Math.min(target.scrollHeight, maxHeight);
                target.style.height = `${next}px`;
              }}
              placeholder="Type your answer…"
              className="mt-2 w-full min-h-[140px] max-h-80 resize-none overflow-y-auto rounded-lg border input-border input-surface px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-mute-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ring-offset-surface"
              maxLength={2000}
              rows={5}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm text-mute">
              <span>Question {step + 1} of {TOTAL}</span>
              <span className="flex items-center gap-2">
                {saving && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-mute-2 animate-pulse" aria-hidden />
                    Saving…
                  </span>
                )}
                {!saving && responseId && Object.keys(answers).length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-mute">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-600" aria-hidden />
                    Saved
                  </span>
                )}
              </span>
            </div>
            <SectionDivider className="pt-2 -mx-5 sm:-mx-6" />
            <div className="sticky bottom-0 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 border-t border-token bg-surface-2 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleBack}
                    disabled={step === 0}
                  >
                    Back
                  </Button>
                </div>
                {step < TOTAL - 1 ? (
                  <Button type="button" onClick={handleNext}>
                    Next question
                  </Button>
                ) : (
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    {saveError && canGenerate && (
                      <MutedText className="text-amber-700">
                        Please save your answers before generating your manual.
                      </MutedText>
                    )}
                    <Button
                      type="button"
                      onClick={handleGoToGenerate}
                      disabled={!canGenerate || saving || !!saveError}
                    >
                      {saving ? "Saving…" : "Convert to manual"}
                    </Button>
                    {!canGenerate && (
                      <MutedText>
                        Answer all questions to unlock the &quot;Convert to manual&quot;
                        step.
                      </MutedText>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </Stack>
    </div>
  );
}
