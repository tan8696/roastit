"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

const FEATURES = [
  { icon: "🔥", title: "The Brutal Truth", desc: "Why your page fails to convert — specific, cited, ruthless." },
  { icon: "🚨", title: "UX Friction Points", desc: "Every weak trust signal and conversion killer, in bullets." },
  { icon: "✍️", title: "The Rewrite", desc: "A high-converting headline, subheadline & CTA. Done for you." },
];

// Shown to anyone who isn't signed in — including search engines and
// AdSense's reviewer. Everything below has to actually render without
// a login, or there's nothing here for either of them to evaluate.
export default function MarketingHome() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
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

      <div className="relative z-10 max-w-3xl mx-auto px-5 pt-20 pb-16">
        {/* Top nav */}
        <nav className="flex items-center justify-between mb-20">
          <span className="text-lg font-black tracking-tight text-white">
            BRUTAL<span className="text-white/25">.</span>
          </span>
          <Link
            href="/login"
            className="px-4 py-2 rounded-full text-sm font-semibold text-white border border-white/15 bg-white/5 hover:bg-white/10 transition-all duration-200"
          >
            Sign In
          </Link>
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

          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/login"
              className="px-6 py-3.5 rounded-xl font-bold text-sm text-black bg-white whitespace-nowrap transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] active:scale-[0.97]"
            >
              Get Started Free →
            </Link>
            <Link
              href="/about"
              className="px-6 py-3.5 rounded-xl font-bold text-sm text-white border border-white/15 bg-white/5 hover:bg-white/10 transition-all duration-200"
            >
              How it works
            </Link>
          </div>
        </div>

        {/* Boardroom teaser */}
        <Link
          href="/login"
          className="mb-6 block rounded-2xl border border-violet-500/20 p-5 group transition-all duration-300 hover:border-violet-500/40 hover:bg-violet-500/3"
          style={{ background: "rgba(139,92,246,0.04)", backdropFilter: "blur(12px)" }}
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
              <span className="text-xs font-medium hidden sm:block">Sign in to try it</span>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </Link>

        {/* What you get */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {FEATURES.map((card) => (
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

        {/* Pricing teaser */}
        <div
          className="rounded-2xl border border-white/10 p-6 mb-16 text-center"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-3">Simple pricing</p>
          <div className="flex flex-wrap justify-center gap-8 mb-5">
            <div>
              <span className="text-3xl font-black text-white">$1</span>
              <span className="text-white/35 text-sm">/mo Pro</span>
            </div>
            <div>
              <span className="text-3xl font-black text-white">$5</span>
              <span className="text-white/35 text-sm">/mo Max</span>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-black bg-white hover:bg-white/90 transition-all duration-200"
          >
            Get Started →
          </Link>
        </div>

        {/* Footer */}
        <footer className="pt-8 border-t border-white/8 flex flex-wrap items-center justify-between gap-4 text-xs text-white/20">
          <span>© 2025 Brutal Roaster</span>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-white/50 transition-colors">About</Link>
            <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-white/50 transition-colors">Contact</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
