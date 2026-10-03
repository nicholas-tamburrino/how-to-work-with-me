"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { useToast } from "@/components/Toast";
import type { ManualContext, ShareLinkRow } from "@/lib/types";
import { Badge, Button, Document, DocumentFooter, DocumentHeader, InfoCallout, MutedText, SectionDivider, SectionTitle } from "@/components/ui";
import { ManualActions } from "./ManualActions";

interface ManualWorkspaceProps {
  manualId: string;
  context: ManualContext;
  version: number;
  createdAt: string;
  shareLinks: ShareLinkRow[];
  isDemo: boolean;
  generatedMarkdown: string;
  editedMarkdown: string | null;
  editedAt: string | null;
}

export function ManualWorkspace({
  manualId,
  context,
  version,
  createdAt,
  shareLinks,
  isDemo,
  generatedMarkdown,
  editedMarkdown,
  editedAt,
}: ManualWorkspaceProps) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [currentEditedMarkdown, setCurrentEditedMarkdown] = useState<string | null>(
    editedMarkdown
  );
  const [draft, setDraft] = useState<string>(editedMarkdown ?? generatedMarkdown);

  const hasEdits = !!currentEditedMarkdown;
  const finalMarkdown = currentEditedMarkdown ?? generatedMarkdown;
  const hasActiveShareLink = shareLinks.some(
    (l) => !l.revoked_at && (!l.expires_at || new Date(l.expires_at) > new Date())
  );

  const lastGeneratedDate = new Date(createdAt);
  const lastGeneratedLabel = lastGeneratedDate.toLocaleString();

  const lastEditedLabel = editedAt ? new Date(editedAt).toLocaleString() : null;

  const handleCancelEditing = () => {
    if (editingDisabled) return;
    // Discard local changes and reset draft back to the current persisted layer.
    if (currentEditedMarkdown != null) {
      setDraft(currentEditedMarkdown);
    } else {
      setDraft(generatedMarkdown);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(api(`/api/manuals/${manualId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? "We couldn’t save your edits. Please try again.";
        toast.error(msg);
        return;
      }
      setCurrentEditedMarkdown(draft);
      toast.success("Saved");
    } catch {
      toast.error("We couldn’t save your edits. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = async () => {
    setIsReverting(true);
    try {
      const res = await fetch(api(`/api/manuals/${manualId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revertToGenerated: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? "We couldn’t revert. Please try again.";
        toast.error(msg);
        return;
      }
      setCurrentEditedMarkdown(null);
      setDraft(generatedMarkdown);
      toast.success("Reverted to original");
    } catch {
      toast.error("We couldn’t revert. Please try again.");
    } finally {
      setIsReverting(false);
    }
  };

  const editingDisabled = isSaving || isReverting || isRegenerating;

  const [showGuidance, setShowGuidance] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem("htwwm_workspace_guidance_dismissed") === "true") {
        setShowGuidance(false);
      }
    } catch {
      // keep default true so guidance shows for new users
    }
  }, []);
  const dismissGuidance = useCallback(() => {
    try {
      localStorage.setItem("htwwm_workspace_guidance_dismissed", "true");
      setShowGuidance(false);
    } catch {
      setShowGuidance(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="space-y-1">
            <SectionTitle>Workspace</SectionTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
              <span>Last generated on {lastGeneratedLabel}</span>
              <span>·</span>
              <span>Version {version}</span>
              {hasEdits && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Badge tone="success">Edited</Badge>
                    {lastEditedLabel && (
                      <span className="text-[11px] text-mute">
                        Updated {lastEditedLabel}
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge tone="muted">{isEditing ? "Edit mode" : "View mode"}</Badge>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <ManualActions
            manualId={manualId}
            context={context}
            shareLinks={shareLinks}
            isDemo={isDemo}
            isEditing={isEditing}
            hasEdits={hasEdits}
            onToggleEdit={() => {
              if (editingDisabled) return;
              dismissGuidance();
              setIsEditing((prev) => !prev);
            }}
            onRegeneratingChange={setIsRegenerating}
          onGuidanceDismiss={dismissGuidance}
        />
        {showGuidance && (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <InfoCallout title="Tip" variant="info" className="flex-1 min-w-0">
              <ul>
                <li><strong>Edit</strong> to tweak tone and wording</li>
                <li><strong>Share</strong> creates a view-only link</li>
                <li><strong>Export PDF</strong> downloads a clean copy</li>
              </ul>
            </InfoCallout>
            <button
              type="button"
              onClick={dismissGuidance}
              className="text-sm text-mute hover:text-ink transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded ring-offset-surface"
              aria-label="Dismiss tip"
            >
              Got it
            </button>
          </div>
        )}
        {isDemo && (
          <p className="mt-2 text-sm leading-6 text-mute">
            Demo manuals use shortened formatting designed for presentations.
          </p>
        )}
      </section>

      <SectionDivider />

      <section className="min-w-0">
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm leading-6 text-mute">
                You&apos;re editing a copy of your manual. Regeneration will always start
                from your latest answers, not from this edited text.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEditing}
                  disabled={editingDisabled}
                  className="text-xs text-mute hover:text-ink"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRevert}
                  disabled={isReverting || editingDisabled || !hasEdits}
                  className="text-xs"
                >
                  {isReverting ? "Reverting…" : "Revert to generated"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || editingDisabled}
                  className="text-xs"
                >
                  {isSaving ? "Saving…" : "Save edits"}
                </Button>
              </div>
            </div>
            <div className="relative">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={editingDisabled}
                className="w-full min-h-[420px] rounded-xl border input-border input-surface p-4 text-sm font-mono leading-relaxed text-ink shadow-[0_24px_60px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 ring-offset-surface"
              />
              <div className="pointer-events-none absolute inset-0 rounded-xl border border-dashed border-token" />
            </div>
          </div>
        ) : (
          <Document className="motion-safe-fade-up">
            <DocumentHeader title="How to Work With Me">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={context === "general" ? "muted" : "default"}>
                  {context === "general" ? "General" : context}
                </Badge>
                {isDemo && <Badge tone="muted">Demo preview</Badge>}
                {hasEdits && <Badge tone="default">Edited</Badge>}
                {hasActiveShareLink && <Badge tone="default">Shared</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-mute">
                <span>Created {lastGeneratedLabel}</span>
                <span aria-hidden>·</span>
                <span>Version {version}</span>
                {hasEdits && lastEditedLabel && (
                  <>
                    <span aria-hidden>·</span>
                    <span>Updated {lastEditedLabel}</span>
                  </>
                )}
              </div>
              {isDemo && (
                <MutedText className="text-sm">
                  Short, skimmable preview for sharing with managers and teammates.
                </MutedText>
              )}
            </DocumentHeader>
            <div className="min-w-0 flex-1">
              <SafeMarkdown content={finalMarkdown} />
            </div>
            <DocumentFooter />
          </Document>
        )}
      </section>
    </div>
  );
}

