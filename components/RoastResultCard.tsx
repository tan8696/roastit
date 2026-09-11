"use client";

import { useState } from "react";
import type { RoastResult } from "@/lib/schemas/roast";

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

export function scoreVerdict(score: number): string {
  if (score >= 70) return "Converting well";
  if (score >= 40) return "Leaking conversions";
  return "Needs serious work";
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-500/10 text-red-300 border-red-500/25",
  moderate: "bg-yellow-500/10 text-yellow-300 border-yellow-500/25",
  minor: "bg-white/8 text-white/50 border-white/15",
};

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/8 p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
      <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-black ${scoreColor(value)}`}>{value}</p>
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

export function formatForCopy(result: RoastResult): string {
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

// The report card itself — reused by the fresh-roast flow (RoastForm) and
// the persistent share page (/r/[slug]), so a shared link renders the exact
// same UI as the original result instead of a second, drifting copy.
export function RoastResultCard({ result }: { result: RoastResult }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(formatForCopy(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fade-in-up">
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
    </div>
  );
}
