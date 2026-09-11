"use client";

// Shared dismissible error banner — was copy-pasted with identical markup
// across chat/page.tsx and boardroom/page.tsx. `actionLabel`/`onAction` are
// optional so callers (e.g. a failed message) can offer a retry inline.
export function ErrorBanner({
  message,
  onDismiss,
  actionLabel,
  onAction,
}: {
  message: string;
  onDismiss: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/15 flex items-center gap-2">
      <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
      </svg>
      <p className="text-xs text-red-300 flex-1">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-xs font-semibold text-red-300 hover:text-white underline underline-offset-2 shrink-0 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
      <button onClick={onDismiss} className="text-red-400/50 hover:text-red-400 cursor-pointer shrink-0">
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
