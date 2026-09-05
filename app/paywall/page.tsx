"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSession } from "next-auth/react";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

// Mirrors app/api/razorpay/create-order/route.ts — for display only,
// the server is the source of truth for what's actually charged.
// Annual = 10x monthly (2 months free).
const TIER_PRICE_INR: Record<string, { monthly: string; annual: string }> = {
  basic: { monthly: "₹99", annual: "₹990" },
  pro: { monthly: "₹449", annual: "₹4,490" },
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: null,
    badge: "Coming Soon",
    badgeStyle: "bg-white/10 text-white/50 border border-white/10",
    cta: "Join Waitlist",
    ctaStyle: "bg-white/5 border border-white/15 text-white/60 cursor-not-allowed",
    disabled: true,
    description: "Watch a short ad before every analysis. Limited prompts per day.",
    features: [
      "1 roast per ad watched",
      "Basic UX friction report",
      "Headline critique only",
      "5 analyses / day max",
      "Ad-supported",
    ],
    tokens: null,
    note: "Free tier coming soon — join the waitlist.",
  },
  {
    id: "basic",
    name: "Pro",
    price: 1,
    badge: "Most Popular",
    badgeStyle: "bg-white text-black",
    cta: "Get Started — Pay & Chat",
    ctaStyle: "bg-white text-black hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]",
    disabled: false,
    description: "Answers & solutions for your business questions, with a focused scope.",
    features: [
      "~10 full teardowns a day",
      "Resets every midnight",
      "Full UX teardown reports",
      "Conversion killer analysis",
      "Headline + CTA rewrites",
      "Business Q&A (focused scope)",
      "Email support",
    ],
    tokens: { daily: 100, perMsg: 10 },
    note: null,
  },
  {
    id: "pro",
    name: "Max",
    price: 5,
    badge: "Best Value",
    badgeStyle: "bg-white/10 text-white border border-white/15",
    cta: "Go Max — Pay & Chat",
    ctaStyle: "bg-white/10 border border-white/20 text-white hover:bg-white/15 hover:scale-[1.02] active:scale-[0.98]",
    disabled: false,
    description: "Complete access — full business intelligence, ~100 messages per day.",
    features: [
      "~100 full teardowns a day",
      "Resets every midnight",
      "Full business strategy chat",
      "Competitive & funnel analysis",
      "Copy rewrites (any section)",
      "Unlimited landing page roasts",
      "Priority support",
    ],
    tokens: { daily: 500, perMsg: 5 },
    note: null,
  },
];

function PaywallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const websiteUrl = searchParams.get("url") || "";
  const { data: session, status } = useSession();
  const [payingTier, setPayingTier] = useState<string | null>(null);
  const [payError, setPayError] = useState("");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  async function handleUpgrade(tierId: string) {
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }
    setPayError("");
    setPayingTier(tierId);

    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId, billing }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        setPayError(order.error || "Could not start checkout.");
        setPayingTier(null);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setPayError("Could not load the payment widget. Check your connection and try again.");
        setPayingTier(null);
        return;
      }

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Brutal Roaster",
        description: `${tierId === "pro" ? "Max" : "Pro"} plan — ${billing === "annual" ? "12 months" : "30 days"}`,
        prefill: {
          name: session.user.name || undefined,
          email: session.user.email || undefined,
        },
        theme: { color: "#ffffff" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              setPayError(verifyData.error || "Payment verification failed. Contact support if you were charged.");
              setPayingTier(null);
              return;
            }
            router.push(`/chat${websiteUrl ? `?url=${encodeURIComponent(websiteUrl)}` : ""}`);
          } catch {
            setPayError("Payment verification failed. Contact support if you were charged.");
            setPayingTier(null);
          }
        },
        modal: {
          ondismiss: () => setPayingTier(null),
        },
      });
      razorpay.open();
    } catch {
      setPayError("Something went wrong starting checkout. Please try again.");
      setPayingTier(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Scanner background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Scanner
          color1="#111111"
          color2="#333333"
          color3="#ffffff"
          speed={0.25}
          sweepSpeed={0.15}
          sweepWidth={2.0}
          sweepFalloff={5}
          scale={1.6}
          frequency={1.8}
          ripple={0.15}
          bandDensity={9}
          lineSharpness={6}
          glow={0.15}
          scanDirection="vertical"
          colorSpread={0.4}
          brightness={0.7}
          contrast={1.2}
          softness={1.8}
          vignette={0.6}
          scanline={true}
          grain={true}
          grainIntensity={0.03}
          opacity={1.0}
          mouseInteraction={true}
          mouseRadius={0.5}
          mouseStrength={0.3}
        />
      </div>
      <div className="fixed inset-0 bg-black/70 z-[1]" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-5 pt-16 pb-24">
        {/* Back nav */}
        <nav className="flex items-center justify-between mb-12">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back
          </button>
          <span className="text-sm font-black tracking-tight text-white">
            BRUTAL<span className="text-white/30">.</span>
          </span>
        </nav>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-medium text-white/50 tracking-wide">
              Choose your teardown plan
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
            Pick your plan
          </h1>
          {websiteUrl && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-2">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-white/40 shrink-0">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              <span className="text-xs text-white/50 max-w-xs truncate">{websiteUrl}</span>
            </div>
          )}
          <p className="text-white/40 text-base max-w-lg mx-auto mt-3">
            Unlock your full landing page teardown. Cancel anytime.
          </p>
          {payError && (
            <p className="mt-4 text-xs text-red-300 bg-red-500/8 border border-red-500/15 rounded-lg px-4 py-2 inline-block">
              {payError}
            </p>
          )}

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 mt-6 p-1 rounded-full border border-white/10 bg-white/5">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${billing === "monthly" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${billing === "annual" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
            >
              Annual — 2 months free
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl border p-7 flex flex-col transition-all duration-300 ${
                tier.id === "basic"
                  ? "border-white/25 bg-white/[0.06] md:-translate-y-2"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
              style={
                tier.id === "basic"
                  ? { boxShadow: "0 0 50px rgba(255,255,255,0.08), 0 30px 70px rgba(0,0,0,0.55)" }
                  : {}
              }
            >
              {/* Badge */}
              {tier.id === "basic" ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-block text-xs font-bold px-3 py-1 rounded-full bg-white text-black shadow-[0_4px_16px_rgba(255,255,255,0.25)] whitespace-nowrap">
                  {tier.badge}
                </span>
              ) : (
                <div className="mb-5">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${tier.badgeStyle}`}>
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Name & price */}
              <div className={`mb-5 ${tier.id === "basic" ? "mt-2" : ""}`}>
                <h2 className="text-xl font-black text-white mb-2">{tier.name}</h2>
                <div className="flex items-baseline gap-1">
                  {tier.price ? (
                    <>
                      <span className="text-4xl font-black text-white">
                        ${billing === "annual" ? tier.price * 10 : tier.price}
                      </span>
                      <span className="text-white/35 text-sm">{billing === "annual" ? "/year" : "/month"}</span>
                    </>
                  ) : (
                    <span className="text-4xl font-black text-white/40">Free</span>
                  )}
                </div>
                {TIER_PRICE_INR[tier.id] && (
                  <p className="text-white/30 text-[11px] mt-1">
                    Charged as {TIER_PRICE_INR[tier.id][billing]} — {billing === "annual" ? "12 months" : "30 days"}
                  </p>
                )}
                <p className="text-white/40 text-xs mt-2 leading-relaxed">{tier.description}</p>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/8 mb-5" />

              {/* Features */}
              <ul className="flex flex-col gap-2.5 mb-7 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <svg
                      className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span className="text-xs text-white/60 leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              {tier.note && (
                <p className="text-xs text-white/25 mb-4 italic">{tier.note}</p>
              )}

              {/* CTA */}
              <button
                id={`plan-${tier.id}-btn`}
                disabled={tier.disabled || payingTier === tier.id}
                onClick={() => !tier.disabled && handleUpgrade(tier.id)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-wait ${tier.ctaStyle}`}
              >
                {payingTier === tier.id ? "Opening checkout…" : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-white/20 mt-10">
          Secure checkout · Cancel anytime · No hidden fees
        </p>
      </div>
    </div>
  );
}

export default function PaywallPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
    }>
      <PaywallContent />
    </Suspense>
  );
}
