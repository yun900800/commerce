"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteButtonProps {
  id: number;
  endpoint: string;
  label?: string;
  redirectTo?: string;
}

export default function DeleteButton({
  id,
  endpoint,
  label = "Delete",
  redirectTo,
}: DeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${endpoint}?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Delete failed");
        setLoading(false);
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Deleting..." : label}
      </button>
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
