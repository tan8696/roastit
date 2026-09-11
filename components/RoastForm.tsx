"use client";

import { FormEvent, useState, useEffect, useRef } from "react";
import type { RoastResult } from "@/lib/schemas/roast";

type RoastApiResponse = RoastResult & { error?: string };

const LOADING_PHASES = [
  "Extracting weak code...",
  "Scanning conversion killers...",
  "Identifying revenue leaks...",
  "Auditing trust signals...",
  "Running Lighthouse audit...",
  "Cross-referencing UX patterns...",
  "Compiling brutal truths...",
];

function TerminalLoader() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setPhaseIndex((i) => (i + 1) % LOADING_PHASES.length);
    }, 1800);
    const dotTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => {
      clearInterval(phaseTimer);
      clearInterval(dotTimer);
    };
  }, []);

  return (
    <div
      className="w-full max-w-2xl mx-auto rounded-2xl border border-white/10 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 0 40px rgba(239,68,68,0.08), 0 25px 80px rgba(0,0,0,0.4)",
      }}
    >
      {/* Terminal title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-zinc-500 font-mono">brutal-roaster — analysis</span>
      </div>

      {/* Terminal body */}
      <div className="p-6 font-mono text-sm min-h-[180px]">
        <div className="text-zinc-500 mb-4 text-xs">
          $ brutal-roaster analyze --mode=ruthless --output=json
        </div>
        <div className="flex items-start gap-2">
          <span className="text-red-400 shrink-0">▶</span>
          <div>
            <span className="text-green-400">{LOADING_PHASES[phaseIndex]}</span>
            <span className="text-green-400">{dots}</span>
            <span className="inline-block w-2 h-4 bg-green-400 ml-1 cursor-blink align-middle" />
          </div>
        </div>
        <div className="mt-4 space-y-1">
          {LOADING_PHASES.slice(0, phaseIndex).map((phase, i) => (
            <div key={i} className="flex items-center gap-2 text-zinc-600 text-xs">
              <span className="text-green-600">✓</span>
              <span>{phase}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function scoreRingColor(score: number): string {
  if (score >= 70) return "border-emerald-500/40";
  if (score >= 40) return "border-yellow-500/40";
  return "border-red-500/40";
}

function scoreVerdict(score: number): string {
  if (score >= 70) return "Converting well";
  if (score >= 40) return "Leaking conversions";
  return "Needs serious work";
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-500/10 text-red-300 border-red-500/25",
  moderate: "bg-yellow-500/10 text-yellow-300 border-yellow-500/25",
  minor: "bg-white/8 text-white/50 border-white/15",
};

function MetricCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/8 p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
      <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-black ${scoreColor(value)}`}>{value}</p>
      {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
    </div>
  );
}

function CategoryCard({ label, score, note }: { label: string; score: number; note: string }) {
  return (
    <div className="rounded-xl border border-white/8 p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-white/70">{label}</p>
        <span className={`text-sm font-black ${scoreColor(score * 10)}`}>{score}/10</span>
      </div>
      <p className="text-xs text-white/40 leading-relaxed">{note}</p>
    </div>
  );
}

function formatForCopy(result: RoastResult): string {
  const lines = [
    `Brutal Roaster teardown — Overall score: ${result.overallScore}/100 (${scoreVerdict(result.overallScore)})`,
    "",
  ];
  if (result.deterministic) {
    lines.push(
      "Measured (Lighthouse, mobile):",
      `  Performance: ${result.deterministic.performanceScore}/100`,
      `  Accessibility: ${result.deterministic.accessibilityScore}/100`,
      `  SEO: ${result.deterministic.seoScore}/100`,
      ""
    );
  }
  lines.push(
    "AI assessment:",
    `  Headline clarity: ${result.categories.headlineClarity.score}/10 — ${result.categories.headlineClarity.note}`,
    `  CTA strength: ${result.categories.ctaStrength.score}/10 — ${result.categories.ctaStrength.note}`,
    `  Social proof: ${result.categories.socialProof.score}/10 — ${result.categories.socialProof.note}`,
    "",
    "Issues:"
  );
  for (const issue of result.issues) {
    lines.push(`  [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.description}`);
  }
  lines.push(
    "",
    "The Rewrite:",
    `  Headline: ${result.rewrite.headline}`,
    `  Subheadline: ${result.rewrite.subheadline}`,
    `  CTA: ${result.rewrite.cta}`
  );
  return lines.join("\n");
}

export function RoastForm() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<RoastResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleRoast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as RoastApiResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "The roast request failed.");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(formatForCopy(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Auto-scroll to result
  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [result]);

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Input panel */}
      {!isLoading && (
        <form onSubmit={handleRoast} className="w-full">
          <div
            className="rounded-2xl border border-white/10 p-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 25px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <input
                  id="roast-url-input"
                  type="url"
                  name="url"
                  required
                  placeholder="https://your-landing-page.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-600 text-sm transition-all duration-200 disabled:opacity-50"
                />
              </div>
              <button
                id="roast-submit-btn"
                type="submit"
                disabled={isLoading}
                className="px-6 py-3.5 rounded-xl font-bold text-sm text-black bg-white whitespace-nowrap transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait disabled:scale-100 cursor-pointer"
              >
                Roast It →
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </div>
        </form>
      )}

      {/* Terminal loading state */}
      {isLoading && <TerminalLoader />}

      {/* Result */}
      {result && !isLoading && (
        <div ref={resultRef} className="fade-in-up">
          {/* Report header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold tracking-widest uppercase text-red-400">
                Teardown Report
              </span>
              {result.cached && (
                <span className="text-[10px] text-white/25 border border-white/10 rounded-full px-2 py-0.5">cached</span>
              )}
            </div>
            <button
              id="roast-copy-btn"
              onClick={handleCopy}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Glowing report card */}
          <div
            className="rounded-2xl border border-red-500/20 overflow-hidden glow-pulse"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {/* Top accent bar */}
            <div className="h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

            <div className="p-6 sm:p-8 space-y-8">
              {/* Overall score */}
              <div className="flex items-center gap-5">
                <div className={`w-20 h-20 rounded-full border-4 ${scoreRingColor(result.overallScore)} flex items-center justify-center shrink-0`}>
                  <span className={`text-2xl font-black ${scoreColor(result.overallScore)}`}>{result.overallScore}</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{scoreVerdict(result.overallScore)}</p>
                  <p className="text-xs text-white/35 mt-0.5">
                    {result.deterministic
                      ? "Blended from measured Lighthouse data + AI assessment"
                      : "AI assessment only — Lighthouse metrics unavailable for this run"}
                  </p>
                </div>
              </div>

              {/* Measured metrics */}
              {result.deterministic && (
                <div>
                  <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2.5">
                    Measured — Lighthouse (mobile)
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <MetricCard label="Performance" value={result.deterministic.performanceScore} />
                    <MetricCard label="Accessibility" value={result.deterministic.accessibilityScore} />
                    <MetricCard label="SEO" value={result.deterministic.seoScore} />
                  </div>
                </div>
              )}

              {/* AI-judged categories */}
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2.5">
                  AI Assessment
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <CategoryCard label="Headline Clarity" score={result.categories.headlineClarity.score} note={result.categories.headlineClarity.note} />
                  <CategoryCard label="CTA Strength" score={result.categories.ctaStrength.score} note={result.categories.ctaStrength.note} />
                  <CategoryCard label="Social Proof" score={result.categories.socialProof.score} note={result.categories.socialProof.note} />
                </div>
              </div>

              {/* Issues */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">🔥</span>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70">Conversion Killers</p>
                </div>
                <div className="space-y-2">
                  {result.issues.map((issue, i) => (
                    <div key={i} className="rounded-lg border border-white/8 px-4 py-3" style={{ background: "rgba(255,255,255,0.015)" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${SEVERITY_STYLE[issue.severity]}`}>
                          {issue.severity}
                        </span>
                        <span className="text-xs font-semibold text-white/60">{issue.category}</span>
                      </div>
                      <p className="text-sm text-white/50 leading-relaxed">{issue.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rewrite */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">✍️</span>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70">The Rewrite</p>
                </div>
                <div className="rounded-lg border border-white/8 p-4 space-y-2.5" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <p className="text-white text-base font-semibold">{result.rewrite.headline}</p>
                  <p className="text-white/50 text-sm">{result.rewrite.subheadline}</p>
                  <span className="inline-block mt-1 px-4 py-2 rounded-lg bg-white text-black text-xs font-bold">
                    {result.rewrite.cta}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom watermark */}
            <div className="flex items-center justify-between px-8 py-4 border-t border-white/5 bg-white/[0.02]">
              <span className="text-xs text-zinc-600">Generated by Brutal Roaster AI</span>
            </div>
          </div>

          {/* Push toward the full chat/boardroom tools — free, just needs an account */}
          <div className="mt-6 rounded-xl border border-white/10 p-5 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-sm text-white/70 mb-3">Want to go deeper? Sign in for unlimited roasts and the AI chat & Boardroom — free.</p>
            <a
              href="/login"
              className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-black bg-white hover:bg-white/90 transition-all duration-200"
            >
              Sign In →
            </a>
          </div>

          {/* Roast again */}
          <div className="mt-4 text-center">
            <button
              id="roast-again-btn"
              onClick={() => { setResult(null); setUrl(""); setError(""); }}
              className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors cursor-pointer"
            >
              ← Roast another page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
