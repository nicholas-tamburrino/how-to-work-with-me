"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSeedDemos() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSeed = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/seed-demos", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message ?? "Seeded.");
        router.refresh();
      } else {
        setMessage(data.error ?? "Failed");
      }
    } catch {
      setMessage("Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleSeed}
        disabled={loading}
        className="px-3 py-2 bg-ink text-surface text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Seeding…" : "Seed 3 demo manuals"}
      </button>
      {message && <span className="text-sm text-mute">{message}</span>}
    </div>
  );
}
