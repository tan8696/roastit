"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { RoastForm } from "@/components/RoastForm";
import { Logo } from "@/components/Logo";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

const FEATURES = [
  { icon: "🔥", title: "The Brutal Truth", desc: "Why your page fails to convert — specific, cited, ruthless." },
  { icon: "🚨", title: "UX Friction Points", desc: "Every weak trust signal and conversion killer, in bullets." },
  { icon: "✍️", title: "The Rewrite", desc: "A high-converting headline, subheadline & CTA. Done for you." },
];

const STEPS = [
  { n: "1", title: "Paste your URL", desc: "Drop in any live landing page. No screenshots, no setup." },
  { n: "2", title: "AI tears it apart", desc: "We scrape the real content and analyze it like a $500/hr copywriter would." },
  { n: "3", title: "Get your rewrite", desc: "A ready-to-ship headline, subheadline, and CTA — done for you." },
];

const FAQ = [
  { q: "Is this actually free?", a: "Yes — paste a URL below and get a full teardown with no signup. Sign in for unlimited roasts plus the AI chat and Virtual Boardroom, also free." },
  { q: "What AI models power this?", a: "Landing page teardowns run on Llama 3.3 (via Groq) for fast, cheap analysis. The chat assistant and Virtual Boardroom run on Google Gemini." },
  { q: "How is this different from asking ChatGPT?", a: "We scrape your actual page content first, so every critique cites real copy from your site instead of generic advice." },
  { q: "Is my data stored?", a: "We scrape the page you submit to generate your report. See our Privacy Policy for full details." },
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
          <span className="flex items-center gap-2 text-lg font-black tracking-tight text-white">
            <Logo size={18} />
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

          {/* Try it free, right here — no signup required for the first one */}
          <div className="mt-8 max-w-xl">
            <RoastForm />
          </div>
          <a
            href="#how-it-works"
            className="inline-block mt-4 text-xs text-white/35 hover:text-white/60 underline underline-offset-2 transition-colors"
          >
            How it works
          </a>
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

        {/* How it works */}
        <div id="how-it-works" className="mb-16 scroll-mt-20">
          <h2 className="text-2xl font-black text-white mb-8 text-center">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="rounded-xl border border-white/8 p-5"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white mb-4">
                  {step.n}
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{step.title}</h3>
                <p className="text-xs text-white/30 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Example teardown */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-white mb-2 text-center">See it in action</h2>
          <p className="text-white/35 text-sm text-center mb-8">
            A real teardown, on a headline every SaaS site has used at some point.
          </p>
          <div
            className="rounded-2xl border border-white/10 p-6 space-y-5"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="pb-5 border-b border-white/8">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">Before</span>
              <p className="text-white/50 text-sm mt-1 font-mono">
                &ldquo;Welcome to Acme — Your One-Stop Solution for All Your Business Needs.&rdquo;
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔥</span>
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">The Brutal Truth</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">
                &ldquo;One-stop solution for all your business needs&rdquo; says nothing. It could be any
                product, for any customer, solving any problem. Visitors bounce in 3 seconds because
                they can&apos;t tell what you actually do.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">✍️</span>
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">The Rewrite</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed font-medium">
                &ldquo;Invoicing for freelancers, paid in 2 days instead of 30.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-white mb-8 text-center">Questions</h2>
          <div className="space-y-2 max-w-2xl mx-auto">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-white/8 px-5 py-4"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <summary className="text-sm font-semibold text-white cursor-pointer list-none flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-white/30 transition-transform duration-200 group-open:rotate-45 shrink-0">+</span>
                </summary>
                <p className="text-xs text-white/35 leading-relaxed mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Free teaser */}
        <div
          className="rounded-2xl border border-white/10 p-6 mb-16 text-center"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-3">100% free</p>
          <p className="text-white/50 text-sm mb-5 max-w-md mx-auto">
            Unlimited roasts, AI chat, and the Virtual Boardroom — no credit card, ever.
          </p>
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
