"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex items-center justify-center">
      {/* Scanner background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, opacity: 0.4 }}>
        <Scanner
          color1="#0a0a0a"
          color2="#1a1a1a"
          color3="#ffffff"
          speed={0.2}
          sweepSpeed={0.12}
          sweepWidth={2.2}
          sweepFalloff={4}
          scale={1.8}
          frequency={1.5}
          ripple={0.1}
          bandDensity={8}
          lineSharpness={6}
          glow={0.15}
          scanDirection="vertical"
          colorSpread={0.3}
          brightness={0.7}
          contrast={1.1}
          softness={2}
          vignette={0.65}
          scanline
          grain
          grainIntensity={0.035}
          opacity={1.0}
          mouseInteraction={false}
        />
      </div>
      <div className="fixed inset-0 bg-black/80 z-[1]" />

      {/* Content */}
      <div className="relative z-10 max-w-xl mx-auto px-6 text-center">

        {/* Brand */}
        <div className="mb-12">
          <span className="text-sm font-black tracking-tight text-white/20">
            BRUTAL<span className="text-white/10">.</span>
          </span>
        </div>

        {/* 404 */}
        <div className="mb-8 relative">
          <div
            className="text-[10rem] sm:text-[14rem] font-black tracking-tighter leading-none select-none"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.03) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            404
          </div>
          {/* Glow effect behind the number */}
          <div
            className="absolute inset-0 -z-10 blur-3xl opacity-10"
            style={{ background: "radial-gradient(ellipse at center, #ffffff 0%, transparent 70%)" }}
          />
        </div>

        {/* Message */}
        <div className="mb-3">
          <h1 className="text-2xl font-black text-white tracking-tight mb-3">
            Page not found.
          </h1>
          <p className="text-white/35 text-sm leading-relaxed max-w-sm mx-auto">
            This page doesn&apos;t exist — or it moved while we weren&apos;t looking.
            Our AI agents have been alerted (they&apos;re skeptical it ever existed).
          </p>
        </div>

        {/* Horizontal rule */}
        <div className="flex items-center gap-4 my-8 max-w-xs mx-auto">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-white/15 text-xs">·</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            id="not-found-home-btn"
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-xl font-bold text-sm text-black bg-white hover:bg-white/90 active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            ← Go Home
          </button>
          <button
            id="not-found-boardroom-btn"
            onClick={() => router.push("/boardroom")}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white/70 border border-white/10 bg-white/4 hover:bg-white/8 hover:border-white/20 hover:text-white active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            🏛️ Open Boardroom
          </button>
          <button
            id="not-found-back-btn"
            onClick={() => router.back()}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white/40 hover:text-white/60 transition-colors duration-200 cursor-pointer"
          >
            ← Go back
          </button>
        </div>

        {/* Footer hint */}
        <p className="mt-12 text-[11px] text-white/15">
          If you think this is a bug, contact{" "}
          <a
            href="mailto:rosterai@gmail.com"
            className="text-white/30 hover:text-white/50 transition-colors underline underline-offset-2"
          >
            rosterai@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
