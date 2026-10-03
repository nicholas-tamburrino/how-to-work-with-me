"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteAllData() {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/me/delete-data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_ALL_MY_DATA" }),
      });
      if (res.ok) {
        router.refresh();
        setStep("idle");
        return;
      }
      const data = await res.json();
      setError(data.error ?? "Could not delete.");
    } catch {
      setError("Could not delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStep("confirm")}
        className="text-sm text-mute hover:text-red-600"
      >
        Delete all my data
      </button>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-red-200 bg-red-50/50 space-y-2">
      <p className="text-sm text-ink font-medium">Delete all your manuals and answers?</p>
      <p className="text-xs text-mute">This cannot be undone. You can create new manuals later.</p>
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:opacity-90 disabled:opacity-60"
        >
          {deleting ? "Deleting…" : "Yes, delete all"}
        </button>
        <button
          type="button"
          onClick={() => { setStep("idle"); setError(null); }}
          disabled={deleting}
          className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
