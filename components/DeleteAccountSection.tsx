"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

// Moved here from the AccountMenu dropdown — a dedicated page is a safer
// home for a destructive, irreversible action than a dropdown menu item.
export default function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete account.");
      }
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-500/15 p-5" style={{ background: "rgba(239,68,68,0.03)" }}>
      <p className="text-xs text-red-400/70 uppercase tracking-wider font-semibold mb-2">Danger zone</p>
      {!confirming ? (
        <button
          id="delete-account-btn"
          onClick={() => setConfirming(true)}
          className="text-sm text-red-400/80 hover:text-red-400 underline underline-offset-2 cursor-pointer"
        >
          Delete account
        </button>
      ) : (
        <div>
          <p className="text-xs text-red-400/80 mb-3 leading-relaxed">
            This will permanently delete your account and all data. This cannot be undone.
          </p>
          {error && <p className="text-xs text-red-300 mb-3">{error}</p>}
          <div className="flex gap-2 max-w-xs">
            <button
              id="delete-account-cancel-btn"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="flex-1 py-1.5 rounded-lg text-xs text-white/50 border border-white/10 hover:border-white/20 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="delete-account-confirm-btn"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
