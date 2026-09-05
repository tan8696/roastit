"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import dynamic from "next/dynamic";
import PrivacyContent from "@/components/PrivacyContent";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your credentials.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not create account.");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(
          mode === "signup"
            ? "Account created, but sign-in failed. Try signing in below."
            : "Invalid email or password."
        );
        setLoading(false);
        return;
      }

      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-black">
      {/* Scanner background */}
      <div style={{ width: "100%", height: "100%", position: "fixed", inset: 0 }}>
        <Scanner
          color1="#111111"
          color2="#444444"
          color3="#ffffff"
          speed={0.3}
          sweepSpeed={0.18}
          sweepWidth={1.8}
          sweepFalloff={5}
          scale={1.4}
          frequency={2}
          ripple={0.18}
          bandDensity={10}
          lineSharpness={6}
          glow={0.18}
          scanDirection="vertical"
          colorSpread={0.5}
          brightness={0.85}
          contrast={1.2}
          softness={1.6}
          vignette={0.55}
          scanline
          grain
          grainIntensity={0.04}
          opacity={1.0}
          mouseInteraction
          mouseRadius={0.5}
          mouseStrength={0.4}
        />
      </div>
      <div className="fixed inset-0 bg-black/65" />

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowPrivacy(false)} />
          <div
            className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 p-8 overflow-y-auto max-h-[80vh]"
            style={{
              background: "rgba(10,10,10,0.98)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 25px 80px rgba(0,0,0,0.8)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white">Privacy Policy</h2>
              <button
                onClick={() => setShowPrivacy(false)}
                className="text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 text-xs text-white/50 leading-relaxed">
              <PrivacyContent />
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Brand */}
        <div className="mb-8 text-center select-none">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-white/40 mb-2">
            AI Landing Page Teardown
          </p>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white leading-none">
            BRUTAL
          </h1>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white/80 to-white/30 leading-none">
            ROASTER
          </h1>
          <p className="mt-3 text-sm text-white/35 max-w-xs mx-auto">
            Ruthless AI-powered teardowns. Every conversion killer exposed.
          </p>
        </div>

        {/* Glass card */}
        <div
          className="w-full max-w-sm rounded-2xl border border-white/10 p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 25px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          <h2 className="text-lg font-semibold text-white mb-1">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h2>
          <p className="text-xs text-white/30 mb-6">
            {mode === "signin" ? "Access your teardown dashboard" : "Start roasting landing pages in seconds"}
          </p>

          {/* Google OAuth Button */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm text-white border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-wait cursor-pointer mb-5"
          >
            {googleLoading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              /* Google "G" logo */
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-5l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3L6 33.8C9.3 39.5 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-4z" />
              </svg>
            )}
            {googleLoading ? "Connecting…" : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-white/25">
              or {mode === "signin" ? "sign in" : "sign up"} with email
            </span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/45 font-medium" htmlFor="login-name">
                  Name
                </label>
                <input
                  id="login-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading || googleLoading}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm transition-all duration-200 disabled:opacity-50 focus:outline-none focus:border-white/30"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/45 font-medium" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || googleLoading}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm transition-all duration-200 disabled:opacity-50 focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/45 font-medium" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || googleLoading}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm transition-all duration-200 disabled:opacity-50 focus:outline-none focus:border-white/30"
              />
            </div>

            {error && (
              <p className="text-xs text-white/60 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 rounded-xl font-bold text-sm text-black bg-white transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(255,255,255,0.3)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait disabled:scale-100 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {mode === "signin" ? "Signing in…" : "Creating account…"}
                </span>
              ) : mode === "signin" ? (
                "Sign In →"
              ) : (
                "Create Account →"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-white/20">
            {mode === "signin" ? "No account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setError("");
                setMode(mode === "signin" ? "signup" : "signin");
              }}
              className="text-white/45 hover:text-white underline underline-offset-2 cursor-pointer transition-colors"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>

        {/* Footer links */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-white/20">
          <button
            onClick={() => setShowPrivacy(true)}
            className="hover:text-white/50 transition-colors cursor-pointer underline underline-offset-2"
          >
            Privacy Policy
          </button>
          <span>·</span>
          <a
            href="mailto:rosterai@gmail.com"
            className="hover:text-white/50 transition-colors"
          >
            Support: rosterai@gmail.com
          </a>
          <span>·</span>
          <span>© 2025 Brutal Roaster</span>
        </div>
      </div>
    </div>
  );
}
