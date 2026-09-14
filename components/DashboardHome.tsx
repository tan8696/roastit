"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/Skeleton";
import { Logo } from "@/components/Logo";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

function DashboardSkeleton() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <div className="relative z-10 max-w-3xl mx-auto px-5 pt-20 pb-24">
        <nav className="flex items-center justify-between mb-20">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </nav>
        <div className="mb-12">
          <Skeleton className="h-7 w-56 rounded-full mb-6" />
          <Skeleton className="h-11 w-full max-w-md mb-3" />
          <Skeleton className="h-11 w-72 mb-5" />
          <Skeleton className="h-4 w-full max-w-xl mb-2" />
          <Skeleton className="h-4 w-3/4 max-w-xl mb-8" />
          <Skeleton className="h-11 w-64 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl mb-12" />
        <Skeleton className="h-28 w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Feedback Modal ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "bug",     label: "🐛 Bug report" },
  { key: "feature", label: "✨ Feature idea" },
  { key: "general", label: "💬 General" },
  { key: "praise",  label: "🙌 Praise" },
] as const;
type Category = typeof CATEGORIES[number]["key"];

const EMOJI_RATINGS = ["😤", "😕", "😐", "😊", "🤩"];

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [rating, setRating]     = useState(0);
  const [hovered, setHovered]   = useState(0);
  const [category, setCategory] = useState<Category>("general");
  const [message, setMessage]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, category, message }),
      });
    } catch { /* show success regardless */ }
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 overflow-hidden"
        style={{
          background: "rgba(12,12,12,0.98)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div>
            <h2 className="text-sm font-bold text-white">Send Feedback</h2>
            <p className="text-[11px] text-white/30 mt-0.5">Help us make Brutal better</p>
          </div>
          <button
            id="feedback-close-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all cursor-pointer"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="px-5 py-12 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-base font-bold text-white mb-2">Thank you!</h3>
            <p className="text-sm text-white/40 leading-relaxed">
              Your feedback has been received. We read every single one.
            </p>
            <button
              id="feedback-done-btn"
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-xl text-sm font-bold text-black bg-white hover:bg-white/90 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Emoji rating */}
            <div>
              <p className="text-[11px] text-white/35 uppercase tracking-wider font-semibold mb-3">How are you feeling?</p>
              <div className="flex gap-2 justify-between">
                {EMOJI_RATINGS.map((emoji, i) => {
                  const val = i + 1;
                  const active = rating === val;
                  const isHovered = hovered === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      id={`feedback-rating-${val}`}
                      onClick={() => setRating(val)}
                      onMouseEnter={() => setHovered(val)}
                      onMouseLeave={() => setHovered(0)}
                      className={`flex-1 py-2.5 rounded-xl border text-xl transition-all duration-150 cursor-pointer ${
                        active
                          ? "border-white/25 bg-white/10 scale-110"
                          : isHovered
                            ? "border-white/15 bg-white/6 scale-105"
                            : "border-white/8 bg-white/3 opacity-60 hover:opacity-100"
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category */}
            <div>
              <p className="text-[11px] text-white/35 uppercase tracking-wider font-semibold mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    id={`feedback-cat-${key}`}
                    onClick={() => setCategory(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer ${
                      category === key
                        ? "border-white/25 bg-white/10 text-white"
                        : "border-white/8 bg-white/3 text-white/40 hover:text-white/60 hover:border-white/15"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <p className="text-[11px] text-white/35 uppercase tracking-wider font-semibold mb-2">Your message</p>
              <textarea
                id="feedback-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you think — the good, the bad, or the ugly…"
                className="w-full rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors leading-relaxed"
                style={{ backdropFilter: "blur(8px)" }}
              />
            </div>

            {/* Submit */}
            <button
              id="feedback-submit-btn"
              type="submit"
              disabled={!message.trim() || submitting}
              className="w-full py-3 rounded-xl font-bold text-sm text-black bg-white hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              {submitting ? "Sending…" : "Send Feedback →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


function AccountMenu({
  name,
  email,
  avatarUrl,
  onSignOut,
  onFeedback,
}: {
  name: string;
  email: string;
  avatarUrl?: string;
  onSignOut: () => void;
  onFeedback: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar button */}
      <button
        id="account-menu-btn"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
            {name?.[0]?.toUpperCase() ?? "U"}
          </div>
        )}
        <span className="text-xs text-white/60 max-w-[120px] truncate hidden sm:block">{name || email}</span>
        <svg
          className={`w-3 h-3 text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 overflow-hidden z-50"
          style={{
            background: "rgba(10,10,10,0.97)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* User info */}
          <div className="px-4 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold text-white">
                  {name?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{name || "User"}</p>
                <p className="text-xs text-white/35 truncate">{email}</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-2">
            <a
              href="mailto:rosterai@gmail.com"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all duration-150 cursor-pointer"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Support
            </a>

            <button
              id="feedback-open-btn"
              onClick={() => { setOpen(false); onFeedback(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all duration-150 cursor-pointer text-left"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              Send Feedback
            </button>

            <a
              href="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all duration-150 cursor-pointer"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              Settings
            </a>

            <button
              id="signout-btn"
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all duration-150 cursor-pointer text-left"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// This component only ever renders once app/page.tsx (a server component)
// has already confirmed a real session via auth() — so unlike before, it
// doesn't need to redirect unauthenticated visitors itself.
export default function DashboardHome() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUrlError("");
    if (!url.trim()) {
      setUrlError("Please enter a website URL.");
      return;
    }
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
    router.push(`/chat?url=${encodeURIComponent(normalized)}`);
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const avatarUrl = session?.user?.image ?? undefined;

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Feedback Modal */}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {/* Scanner background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Scanner
          color1="#0a0a0a"
          color2="#2a2a2a"
          color3="#ffffff"
          speed={0.3}
          sweepSpeed={0.18}
          sweepWidth={1.9}
          sweepFalloff={5}
          scale={1.5}
          frequency={2}
          ripple={0.18}
          bandDensity={10}
          lineSharpness={5.8}
          glow={0.18}
          scanDirection="vertical"
          colorSpread={0.5}
          brightness={0.8}
          contrast={1.2}
          softness={1.6}
          vignette={0.55}
          scanline
          grain
          grainIntensity={0.04}
          opacity={1.0}
          mouseInteraction
          mouseRadius={0.5}
          mouseStrength={0.35}
        />
      </div>
      <div className="fixed inset-0 bg-black/72 z-[1]" />

      <div className="relative z-10 max-w-3xl mx-auto px-5 pt-20 pb-24">
        {/* Top nav */}
        <nav className="flex items-center justify-between mb-20">
          <span className="flex items-center gap-2 text-lg font-black tracking-tight text-white">
            <Logo size={18} />
            BRUTAL<span className="text-white/25">.</span>
          </span>
          <AccountMenu
            name={userName}
            email={userEmail}
            avatarUrl={avatarUrl}
            onSignOut={handleSignOut}
            onFeedback={() => setShowFeedback(true)}
          />
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-medium text-white/45 tracking-wide">
              AI-powered · Direct-response expert
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.05] mb-5">
            We tear apart<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">
              your landing page.
            </span>
          </h1>

          <p className="text-white/40 text-lg leading-relaxed max-w-xl">
            Paste any URL. Our ruthless AI copywriter scrapes it, exposes every conversion
            killer, and hands you a ready-to-ship rewrite — in seconds.
          </p>
        </div>

        {/* URL Input → paywall */}
        <form onSubmit={handleSubmit} className="w-full mb-12">
          <div
            className="rounded-2xl border border-white/10 p-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 25px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <input
                  id="roast-url-input"
                  type="url"
                  name="url"
                  placeholder="https://your-landing-page.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm transition-all duration-200 focus:outline-none focus:border-white/25"
                />
              </div>
              <button
                id="roast-submit-btn"
                type="submit"
                className="px-6 py-3.5 rounded-xl font-bold text-sm text-black bg-white whitespace-nowrap transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] active:scale-[0.97] cursor-pointer"
              >
                Roast It →
              </button>
            </div>
            {urlError && (
              <p className="mt-3 text-xs text-white/45 px-1">{urlError}</p>
            )}
          </div>
        </form>

        {/* Boardroom CTA */}
        <div
          className="mb-6 rounded-2xl border border-violet-500/20 p-5 cursor-pointer group transition-all duration-300 hover:border-violet-500/40 hover:bg-violet-500/3"
          style={{ background: "rgba(139,92,246,0.04)", backdropFilter: "blur(12px)" }}
          onClick={() => router.push("/boardroom")}
          role="button"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-2xl shrink-0">
                🏛️
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-sm font-bold text-white">Virtual Startup Boardroom</h2>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20 uppercase tracking-wider">New</span>
                </div>
                <p className="text-xs text-white/35 leading-relaxed max-w-md">
                  5 AI agents debate your idea — Believer, Skeptic, Investor, and the Judge deliver a final verdict.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 text-violet-400/60 group-hover:text-violet-300 transition-colors">
              <span className="text-xs font-medium hidden sm:block">Open Boardroom</span>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>

        {/* What you get */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "🔥", title: "The Brutal Truth", desc: "Why your page fails to convert — specific, cited, ruthless." },
            { icon: "🚨", title: "UX Friction Points", desc: "Every weak trust signal and conversion killer, in bullets." },
            { icon: "✍️", title: "The Rewrite", desc: "A high-converting headline, subheadline & CTA. Done for you." },
          ].map((card) => (
            <div
              key={card.title}
              className="group rounded-xl border border-white/8 p-5 transition-all duration-300 hover:border-white/15 hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div
                className="w-10 h-10 rounded-lg border border-white/8 flex items-center justify-center text-lg mb-4 transition-colors duration-300 group-hover:border-white/20"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                {card.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{card.title}</h3>
              <p className="text-xs text-white/30 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-white/8 flex flex-wrap items-center justify-between gap-4 text-xs text-white/20">
          <span>© 2025 Brutal Roaster</span>
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-white/50 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy</a>
            <a href="mailto:rosterai@gmail.com" className="hover:text-white/50 transition-colors">
              rosterai@gmail.com
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
