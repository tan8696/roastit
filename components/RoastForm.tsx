"use client";

import { FormEvent, useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";

type RoastResponse = {
  roast?: string;
  error?: string;
};

const LOADING_PHASES = [
  "Extracting weak code...",
  "Scanning conversion killers...",
  "Identifying revenue leaks...",
  "Auditing trust signals...",
  "Cross-referencing UX patterns...",
  "Compiling brutal truths...",
  "Drafting the teardown...",
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
          $ brutal-roaster analyze --mode=ruthless --output=markdown
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

export function RoastForm() {
  const [url, setUrl] = useState("");
  const [roast, setRoast] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleRoast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setRoast("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as RoastResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "The roast request failed.");
      }

      if (!data.roast) {
        throw new Error("The API returned no roast.");
      }

      setRoast(data.roast);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-scroll to result
  useEffect(() => {
    if (roast && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [roast]);

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
      {roast && !isLoading && (
        <div ref={resultRef} className="fade-in-up">
          {/* Report header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold tracking-widest uppercase text-red-400">
                Teardown Report
              </span>
            </div>
            <button
              id="roast-copy-btn"
              onClick={() => navigator.clipboard.writeText(roast)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
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

            <div className="p-8">
              <article className="prose prose-invert prose-sm max-w-none
                prose-headings:text-white prose-headings:font-bold
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-base prose-h3:text-zinc-200
                prose-p:text-zinc-300 prose-p:leading-relaxed
                prose-li:text-zinc-300
                prose-strong:text-white prose-strong:font-semibold
                prose-ul:space-y-1
                prose-a:text-red-400 prose-a:no-underline hover:prose-a:underline
                prose-code:text-red-300 prose-code:bg-red-500/10 prose-code:rounded prose-code:px-1
                [&>*:first-child]:mt-0">
                <Markdown>{roast}</Markdown>
              </article>
            </div>

            {/* Bottom watermark */}
            <div className="flex items-center justify-between px-8 py-4 border-t border-white/5 bg-white/[0.02]">
              <span className="text-xs text-zinc-600">Generated by Brutal Roaster AI</span>
            </div>
          </div>

          {/* Roast again */}
          <div className="mt-6 text-center">
            <button
              id="roast-again-btn"
              onClick={() => { setRoast(""); setUrl(""); setError(""); }}
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
