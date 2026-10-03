"use client";

import { useState } from "react";

export function AdminRevokeShareLink() {
  const [shareLinkId, setShareLinkId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleRevoke = async () => {
    const id = shareLinkId.trim();
    if (!id) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/revoke-share-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareLinkId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("done");
        setMessage("Revoked.");
        setShareLinkId("");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Failed");
      }
    } catch {
      setStatus("error");
      setMessage("Request failed");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="Share link UUID"
        value={shareLinkId}
        onChange={(e) => setShareLinkId(e.target.value)}
        className="px-3 py-2 border border-stone-200 rounded-lg text-sm font-mono w-64"
      />
      <button
        type="button"
        onClick={handleRevoke}
        disabled={status === "loading"}
        className="px-3 py-2 bg-ink text-surface text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60"
      >
        {status === "loading" ? "Revoking…" : "Revoke"}
      </button>
      {message && (
        <span className={status === "error" ? "text-red-600 text-sm" : "text-mute text-sm"}>
          {message}
        </span>
      )}
    </div>
  );
}
