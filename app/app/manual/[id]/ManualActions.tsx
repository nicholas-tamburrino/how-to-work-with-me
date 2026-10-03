"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { LoadingButton } from "@/components/LoadingButton";
import type { ManualContext, ShareLinkRow } from "@/lib/types";
import { Badge, Button, MutedText } from "@/components/ui";

function friendlyMessage(apiError: string): string {
  if (!apiError) return "Something went wrong. Please try again.";
  if (apiError === "Unauthorized" || apiError.toLowerCase().includes("unauthorized"))
    return "Please sign in again to continue.";
  if (
    apiError === "Not found" ||
    apiError === "Manual not found" ||
    apiError === "Export job not found" ||
    apiError === "Export result not available"
  )
    return "We couldn’t find that manual or export. It may have been deleted.";
  if (apiError.includes("Too many")) return "Too many attempts. Please wait a minute and try again.";
  if (apiError.includes("Invalid export") || apiError.includes("Invalid export data"))
    return "Export data was invalid. Please try again.";
  if (apiError.includes("too large")) return "PDF is too large. Try Markdown or a shorter manual.";
  return "Something went wrong. Please try again.";
}

export function ManualActions({
  manualId,
  context,
  shareLinks,
  isDemo = false,
  isEditing = false,
  hasEdits = false,
  onToggleEdit,
  onRegeneratingChange,
  onGuidanceDismiss,
}: {
  manualId: string;
  context: ManualContext;
  shareLinks: ShareLinkRow[];
  isDemo?: boolean;
  isEditing?: boolean;
  hasEdits?: boolean;
  onToggleEdit?: () => void;
  onRegeneratingChange?: (value: boolean) => void;
  onGuidanceDismiss?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [links, setLinks] = useState(shareLinks);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfJobId, setPdfJobId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [newLinkUrl, setNewLinkUrl] = useState<string | null>(null);
  const [newLinkId, setNewLinkId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteInFlightRef = useRef(false);
  const deleteSucceededRef = useRef(false);
  const revokingIdsRef = useRef<Set<string>>(new Set());
  const createShareInFlightRef = useRef(false);
  const shareUrlInputRef = useRef<HTMLInputElement>(null);

  const activeLinks = links.filter((l) => !l.revoked_at && (!l.expires_at || new Date(l.expires_at) > new Date()));
  const revokedLinks = links.filter((l) => l.revoked_at || (l.expires_at && new Date(l.expires_at) <= new Date()));
  const hasActiveLink = newLinkUrl != null || activeLinks.length > 0;
  const displayShareUrl = newLinkUrl ?? null;

  const handleExportPdf = async () => {
    if (exportingPdf || pdfJobId) return;
    onGuidanceDismiss?.();
    setExportingPdf(true);
    setExportError(null);
    setPdfJobId(null);
    try {
      const res = await fetch(api(`/api/manuals/${manualId}/export/pdf`), {
        method: "POST",
      });
      let data: { error?: string; jobId?: string } = {};
      try {
        data = await res.json();
      } catch {
        // non-JSON response (e.g. network error)
      }
      if (res.status === 401) {
        toast.error("Please sign in again to continue.");
        setExportingPdf(false);
        return;
      }
      if (!res.ok) {
        const msg = friendlyMessage(data.error ?? "Export failed");
        setExportError(msg);
        toast.error(msg);
        setExportingPdf(false);
        return;
      }
      if (res.status === 202 && data.jobId) {
        setPdfJobId(data.jobId);
        await pollPdfExportStatus(data.jobId);
        return;
      }
      toast.error("Export could not be started. Please try again.");
      setExportError("Export could not be started.");
      setExportingPdf(false);
    } catch {
      toast.error("Export failed. Please check your connection and try again.");
      setExportError("Export failed. Please try again.");
      setExportingPdf(false);
    }
  };

  async function pollPdfExportStatus(jobId: string): Promise<void> {
    const maxAttempts = 40;
    const intervalMs = 1500;
    try {
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, intervalMs));
        let res: Response;
        let data: { status?: string; error?: string } = {};
        try {
          res = await fetch(api(`/api/generate/status?jobId=${jobId}`));
          try {
            data = await res.json();
          } catch {
            data = { status: "unknown" };
          }
        } catch {
          toast.error("Could not check export status. Please try again.");
          return;
        }
        if (res.status === 401) {
          toast.error("Please sign in again to continue.");
          return;
        }
        if (res.status === 404 || !data.status) {
          toast.error("Export job could not be found. Please try again.");
          return;
        }
        if (data.status === "completed") {
          let downloadRes: Response;
          try {
            downloadRes = await fetch(
              api(`/api/manuals/${manualId}/export/pdf/download?jobId=${jobId}`)
            );
          } catch {
            toast.error("PDF download failed. Please try again.");
            return;
          }
          if (downloadRes.ok && downloadRes.headers.get("Content-Type")?.includes("application/pdf")) {
            const blob = await downloadRes.blob();
            const url = URL.createObjectURL(blob);
            const disposition = downloadRes.headers.get("Content-Disposition");
            const quoted = disposition?.match(/filename="([^"]*)"/i)?.[1];
            const filename = quoted?.trim() ?? `how-to-work-with-me-${manualId.slice(0, 8)}.pdf`;
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success("PDF downloaded. Your file is in your downloads.");
          } else {
            let errMsg = "Export result not available.";
            try {
              const errBody = await downloadRes.json();
              if (errBody?.error) errMsg = errBody.error;
            } catch {
              // ignore
            }
            toast.error(friendlyMessage(errMsg));
          }
          return;
        }
        if (data.status === "failed") {
          const msg = data.error ?? "PDF export failed";
          toast.error(friendlyMessage(msg));
          setExportError(msg);
          return;
        }
        // pending or running: continue polling
      }
      // Timeout
      toast.error("PDF export is taking longer than expected. Please try again.");
      setExportError("Export timed out. Please try again.");
    } finally {
      setExportingPdf(false);
      setPdfJobId(null);
    }
  }

  const copyShareUrl = (url: string, inputEl: HTMLInputElement | null) => {
    const doToast = () => toast.success("Link copied");
    navigator.clipboard.writeText(url).then(doToast, () => {
      try {
        inputEl?.select();
        if (document.execCommand("copy")) {
          toast.success("Link copied");
        } else {
          inputEl?.select();
          toast.success("Link selected — copy with Ctrl+C");
        }
      } catch {
        inputEl?.select();
        toast.success("Link selected — copy with Ctrl+C");
      }
    });
  };

  const handleCreateShare = async () => {
    if (createShareInFlightRef.current || creating) return;
    onGuidanceDismiss?.();
    createShareInFlightRef.current = true;
    setCreating(true);
    setNewLinkUrl(null);
    setShareError(null);
    try {
      const res = await fetch(api("/api/share"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualId }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        setNewLinkUrl(data.url);
        setNewLinkId(data.id);
        setLinks((prev) => [...prev, { id: data.id, manual_id: manualId, token_hash: "", expires_at: data.expires_at ?? null, revoked_at: null, created_at: data.created_at }]);
        toast.success("Share link created.");
        requestAnimationFrame(() => {
          shareUrlInputRef.current?.focus();
          shareUrlInputRef.current?.select();
          copyShareUrl(data.url, shareUrlInputRef.current);
        });
        return;
      }
      const msg = friendlyMessage(data.error ?? "Could not create link");
      setShareError(msg);
      toast.error(msg);
    } catch {
      const msg = "Could not create share link. Please try again.";
      setShareError(msg);
      toast.error(msg);
    } finally {
      createShareInFlightRef.current = false;
      setCreating(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    onRegeneratingChange?.(true);
    setRegenerateError(null);
    try {
      const res = await fetch(api("/api/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualId, context }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = friendlyMessage(data.error ?? "Generation failed");
        setRegenerateError(msg);
        toast.error(msg);
        return;
      }
      if (res.status === 202 && data.jobId) {
        const newManualId = await pollJobStatus(data.jobId);
        if (newManualId) {
          toast.success("Manual created");
          router.push(`/app/manual/${newManualId}`);
          return;
        }
        const msg = "Generation didn't complete. Please try again.";
        setRegenerateError(msg);
        toast.error(msg);
        return;
      }
      if (data.manualId) {
        toast.success("Manual created");
        router.push(`/app/manual/${data.manualId}`);
      }
    } catch {
      const msg = "Generation failed. Please try again.";
      setRegenerateError(msg);
      toast.error(msg);
    } finally {
      setRegenerating(false);
      onRegeneratingChange?.(false);
    }
  };

  async function pollJobStatus(jobId: string): Promise<string | null> {
    const maxAttempts = 40;
    const intervalMs = 1500;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const res = await fetch(api(`/api/generate/status?jobId=${jobId}`));
      const data = await res.json();
      if (data.status === "completed" && data.manualId) return data.manualId;
      if (data.status === "failed") return null;
    }
    return null;
  }

  const handleDeleteManual = async (
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    event?.stopPropagation();
    if (deleteInFlightRef.current || deleting) return;
    if (!confirm("Delete this manual? This action can’t be undone.")) return;
    deleteInFlightRef.current = true;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(api(`/api/manuals/${manualId}`), { method: "DELETE" });
      const data = res.status === 204 ? {} : await res.json().catch(() => ({}));

      if (res.ok) {
        deleteSucceededRef.current = true;
        toast.success("Manual deleted");
        router.push("/app");
        router.refresh();
        return;
      }

      if (res.status === 401 && deleteSucceededRef.current) return;
      const msg = (data as { error?: string }).error ?? "We couldn’t delete the manual. Please try again.";
      setDeleteError(msg);
      toast.error(msg);
    } catch {
      if (deleteSucceededRef.current) return;
      const msg = "We couldn’t delete the manual. Please try again.";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      deleteInFlightRef.current = false;
      setDeleting(false);
    }
  };

  const handleRevoke = async (shareLinkId: string) => {
    if (revokingIdsRef.current.has(shareLinkId)) return;
    if (!confirm("Revoke this share link? Anyone with the link will lose access.")) return;
    revokingIdsRef.current.add(shareLinkId);
    setRevokingId(shareLinkId);
    try {
      const res = await fetch(api("/api/share"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareLinkId }),
        credentials: "include",
      });
      if (res.ok) {
        setLinks((prev) =>
          prev.map((l) => (l.id === shareLinkId ? { ...l, revoked_at: new Date().toISOString() } : l))
        );
        if (newLinkUrl) setNewLinkUrl(null);
        if (newLinkId === shareLinkId) setNewLinkId(null);
        toast.success("Share link revoked");
      } else {
        toast.error("We couldn’t revoke the link. Please try again.");
      }
    } catch {
      toast.error("We couldn’t revoke the link. Please try again.");
    } finally {
      revokingIdsRef.current.delete(shareLinkId);
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <LoadingButton
          onClick={handleRegenerate}
          isLoading={regenerating}
          loadingText="Regenerating…"
          disabled={regenerating || exportingPdf || creating || deleting}
          className="text-sm font-medium elevate-hover focus-ring-accent"
        >
          {isDemo ? "Regenerate demo" : "Regenerate manual"}
        </LoadingButton>
        <Button
          type="button"
          onClick={onToggleEdit}
          disabled={regenerating || exportingPdf || creating || deleting}
          className="text-sm font-medium elevate-hover focus-ring-accent"
          variant="secondary"
          size="md"
        >
          {isEditing ? "Exit edit mode" : hasEdits ? "Edit manual (edited)" : "Edit manual"}
        </Button>
        <LoadingButton
          onClick={handleExportPdf}
          isLoading={exportingPdf}
          loadingText={pdfJobId ? "Exporting…" : "Starting…"}
          disabled={exportingPdf || regenerating || creating || deleting}
          className="text-sm font-medium elevate-hover focus-ring-accent"
        >
          Export PDF
        </LoadingButton>
        <LoadingButton
          onClick={handleDeleteManual}
          isLoading={deleting}
          loadingText="Deleting…"
          disabled={deleting || regenerating || exportingPdf || creating}
          className="text-sm font-medium text-red-700"
        >
          Delete my manual
        </LoadingButton>
      </div>

      {deleteError && (
        <p className="text-body-sm text-error-600">{deleteError}</p>
      )}

      {(regenerateError || exportError || shareError) && (
        <div className="w-full rounded-2xl border border-error-200 bg-error-50 p-3 text-body-sm text-error-800 space-y-1">
          {regenerateError && (
            <p className="flex items-center gap-2">
              {regenerateError}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRegenerate}
                className="border-error-200 bg-error-50 text-error-800 hover:bg-error-50/90"
              >
                Retry
              </Button>
            </p>
          )}
          {exportError && (
            <p className="flex items-center gap-2">
              {exportError}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleExportPdf}
                className="border-error-200 bg-error-50 text-error-800 hover:bg-error-50/90"
              >
                Retry
              </Button>
            </p>
          )}
          {shareError && (
            <p className="flex items-center gap-2">
              {shareError}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCreateShare}
                className="border-error-200 bg-error-50 text-error-800 hover:bg-error-50/90"
              >
                Retry
              </Button>
            </p>
          )}
        </div>
      )}

      {/* Share panel — always visible, Notion-clean */}
      <div className="w-full rounded-xl border border-token bg-surface-2 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-ink">Share</h3>
          <p className="mt-1 text-sm text-mute leading-relaxed">
            Anyone with this link can view your manual. They cannot edit it.
          </p>
        </div>

        {shareError && (
          <p className="text-body-sm text-error-600">{shareError}</p>
        )}

        {!hasActiveLink && (
          <div>
            <LoadingButton
              onClick={handleCreateShare}
              isLoading={creating}
              loadingText="Creating…"
              disabled={creating || regenerating || exportingPdf || deleting}
              className="text-sm font-medium elevate-hover focus-ring-accent"
            >
              Create share link
            </LoadingButton>
          </div>
        )}

        {displayShareUrl && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="default">Active</Badge>
              {(() => {
                const link = newLinkId ? links.find((l) => l.id === newLinkId) : null;
                const expiresAt = link?.expires_at ?? null;
                return expiresAt ? (
                  <span className="text-xs text-mute">Expires: {new Date(expiresAt).toLocaleDateString()}</span>
                ) : (
                  <span className="text-xs text-mute">No expiration</span>
                );
              })()}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={shareUrlInputRef}
                type="text"
                readOnly
                value={displayShareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 rounded-lg border input-border input-surface px-3 py-2 text-sm font-mono text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ring-offset-surface"
                aria-label="Share link URL"
              />
              <Button
                type="button"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  copyShareUrl(displayShareUrl, shareUrlInputRef.current);
                }}
                className="focus-ring-accent"
              >
                Copy link
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  if (newLinkId) handleRevoke(newLinkId);
                }}
                disabled={!!revokingId}
                className="focus-ring-accent"
              >
                {revokingId === newLinkId ? "Revoking…" : "Revoke"}
              </Button>
            </div>
          </div>
        )}

        {hasActiveLink && !displayShareUrl && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="default">Active</Badge>
              <span className="text-xs text-mute">Link created — URL not shown again for security</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LoadingButton
                onClick={handleCreateShare}
                isLoading={creating}
                loadingText="Creating…"
                disabled={creating || regenerating || exportingPdf || deleting}
                className="text-sm font-medium elevate-hover focus-ring-accent"
              >
                Create new link
              </LoadingButton>
              {activeLinks.map((l) => (
                <Button
                  key={l.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleRevoke(l.id); }}
                  disabled={revokingId === l.id}
                  className="focus-ring-accent"
                >
                  {revokingId === l.id ? "Revoking…" : "Revoke"}
                </Button>
              ))}
            </div>
          </div>
        )}

        {revokedLinks.length > 0 && (
          <div className="border-t border-token pt-3 space-y-2">
            <p className="text-xs font-medium text-mute">Revoked or expired</p>
            <ul className="space-y-1.5">
              {revokedLinks.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone="muted">{l.revoked_at ? "Revoked" : "Expired"}</Badge>
                  <span className="text-mute">
                    {l.revoked_at ? "Revoked" : "Expired"} — {new Date(l.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
