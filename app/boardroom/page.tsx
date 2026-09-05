"use client";

import {
  useEffect,
  useState,
  useRef,
  FormEvent,
  Suspense,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import Markdown from "react-markdown";
import AdBanner from "@/components/AdBanner";
import { Skeleton } from "@/components/Skeleton";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

function BoardroomSkeleton() {
  return (
    <div className="relative flex h-screen bg-black overflow-hidden">
      <aside className="hidden md:flex flex-col w-72 border-r border-white/8 shrink-0 p-4 gap-3">
        <Skeleton className="h-6 w-24 mb-2" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex flex-col gap-2 mt-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-3/4 rounded-lg" />
        </div>
      </aside>
      <div className="flex flex-col flex-1 min-w-0 items-center px-4 py-16">
        <Skeleton className="h-7 w-64 rounded-full mb-6" />
        <Skeleton className="h-10 w-80 mb-4" />
        <Skeleton className="h-4 w-full max-w-lg mb-2" />
        <Skeleton className="h-4 w-3/4 max-w-lg mb-8" />
        <Skeleton className="h-28 w-full max-w-2xl rounded-2xl" />
      </div>
    </div>
  );
}

// ─── Credit System (mirrors /chat/page.tsx) ────────────────────────────────
const TIER_CONFIG = {
  basic: { name: "Pro", price: "$1/mo", dailyTokens: 100 },
  pro: { name: "Max", price: "$5/mo", dailyTokens: 500 },
} as const;
type Tier = keyof typeof TIER_CONFIG;

interface CreditState {
  tier: Tier;
  tokens: number;
  dailyLimit: number;
  lastReset: string;
}
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}
function loadCreditState(tier: Tier): CreditState {
  const today = getTodayStr();
  const config = TIER_CONFIG[tier];
  try {
    const raw = localStorage.getItem("brutal_tokens");
    if (raw) {
      const saved: CreditState = JSON.parse(raw);
      if (saved.lastReset !== today || saved.tier !== tier) {
        const fresh = {
          tier,
          tokens: config.dailyTokens,
          dailyLimit: config.dailyTokens,
          lastReset: today,
        };
        localStorage.setItem("brutal_tokens", JSON.stringify(fresh));
        return fresh;
      }
      return saved;
    }
  } catch {}
  const fresh = {
    tier,
    tokens: config.dailyTokens,
    dailyLimit: config.dailyTokens,
    lastReset: today,
  };
  localStorage.setItem("brutal_tokens", JSON.stringify(fresh));
  return fresh;
}
function saveCreditState(state: CreditState) {
  localStorage.setItem("brutal_tokens", JSON.stringify(state));
}

// ─── Session History ──────────────────────────────────────────────────────────
type BoardroomResult = {
  type: "boardroom";
  believer: string;
  skeptic: string;
  investor: string;
  judge: string;
  suggestedQuestions: string[];
  creditsUsed: number;
  websiteContext: boolean;
};
type AnswerResult = {
  type: "answer";
  reply: string;
  suggestedQuestions: string[];
  creditsUsed: number;
};
type SessionResult = BoardroomResult | AnswerResult;

interface BoardSession {
  id: string;
  title: string;
  tier: Tier;
  userInput: string;
  websiteUrl?: string;
  result: SessionResult;
  createdAt: string;
}
const HISTORY_KEY = "brutal_boardroom_history";
const MAX_SESSIONS = 30;

function loadHistory(): BoardSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as BoardSession[]) : [];
  } catch {
    return [];
  }
}
function saveHistory(sessions: BoardSession[]) {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(sessions.slice(0, MAX_SESSIONS))
    );
  } catch {}
}
function upsertSession(
  sessions: BoardSession[],
  session: BoardSession
): BoardSession[] {
  const idx = sessions.findIndex((s) => s.id === session.id);
  return idx >= 0
    ? [session, ...sessions.filter((_, i) => i !== idx)].sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      )
    : [session, ...sessions];
}
function groupByDate(
  sessions: BoardSession[]
): { label: string; items: BoardSession[] }[] {
  const today = getTodayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const groups: Record<string, BoardSession[]> = {};
  for (const s of sessions) {
    const d = s.createdAt.slice(0, 10);
    const label =
      d === today
        ? "Today"
        : d === yesterday
          ? "Yesterday"
          : d >= today.slice(0, 7) + "-01"
            ? "This Month"
            : "Older";
    (groups[label] ??= []).push(s);
  }
  const order = ["Today", "Yesterday", "This Month", "Older"];
  return order.filter((l) => groups[l]).map((label) => ({ label, items: groups[label] }));
}

// ─── Persona Card Definitions ─────────────────────────────────────────────────
const PERSONAS = {
  believer: {
    label: "The Believer",
    emoji: "🚀",
    role: "Optimistic Visionary",
    accent: "from-emerald-500/20 to-green-500/5",
    border: "border-emerald-500/20",
    badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-400",
    glow: "shadow-emerald-500/10",
  },
  skeptic: {
    label: "The Skeptic",
    emoji: "🔥",
    role: "Risk Analyst",
    accent: "from-red-500/20 to-rose-500/5",
    border: "border-red-500/20",
    badge: "bg-red-500/10 text-red-300 border-red-500/20",
    dot: "bg-red-400",
    glow: "shadow-red-500/10",
  },
  investor: {
    label: "The Investor",
    emoji: "💰",
    role: "Unit Economics",
    accent: "from-amber-500/20 to-yellow-500/5",
    border: "border-amber-500/20",
    badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    dot: "bg-amber-400",
    glow: "shadow-amber-500/10",
  },
  judge: {
    label: "The Judge",
    emoji: "⚖️",
    role: "Veteran CEO",
    accent: "from-violet-500/20 to-purple-500/5",
    border: "border-violet-500/20",
    badge: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    dot: "bg-violet-400",
    glow: "shadow-violet-500/10",
  },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────
function PersonaCard({
  personaKey,
  content,
  delay,
  index,
}: {
  personaKey: keyof typeof PERSONAS;
  content: string;
  delay: number;
  index?: number;
}) {
  const [visible, setVisible] = useState(false);
  const p = PERSONAS[personaKey];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const isJudge = personaKey === "judge";

  return (
    <div
      className={`transition-all duration-700 h-full ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      <div
        className={`rounded-2xl border ${p.border} bg-gradient-to-b ${p.accent} ${isJudge ? "shadow-xl " + p.glow : ""} overflow-hidden h-full flex flex-col`}
        style={{ backdropFilter: "blur(12px)" }}
      >
        {/* Card header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/6 shrink-0">
          {/* Number badge for board members */}
          {index !== undefined && (
            <span className="text-[10px] font-black text-white/20 w-5 shrink-0 tabular-nums">
              0{index}
            </span>
          )}
          <div className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-lg shrink-0">
            {p.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{p.label}</span>
              {isJudge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/25 uppercase tracking-wider">
                  Final Verdict
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${p.dot} animate-pulse`} />
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${p.badge}`}>
                {p.role}
              </span>
            </div>
          </div>
        </div>

        {/* Card content — flex-1 so all cards fill the same height */}
        <div className="px-5 py-4 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent", maxHeight: "380px" }}>
          <article className="prose prose-invert prose-sm max-w-none
            prose-headings:text-white prose-headings:font-bold prose-headings:mb-2 prose-headings:mt-3 prose-headings:text-sm
            prose-p:text-white/75 prose-p:leading-relaxed prose-p:my-1.5
            prose-li:text-white/75 prose-li:my-0.5 prose-strong:text-white prose-strong:font-semibold
            prose-ul:my-1 prose-ol:my-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <Markdown>{content}</Markdown>
          </article>
        </div>
      </div>
    </div>
  );
}

function LoadingStage({ stage }: { stage: string }) {
  const stages = [
    { key: "routing", label: "Routing your idea…" },
    { key: "scraping", label: "Fetching website context…" },
    { key: "board", label: "Convening the board…" },
    { key: "judge", label: "Judge synthesizing…" },
  ];
  const currentIdx = stages.findIndex((s) => s.key === stage);

  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border border-white/10 bg-white/3 flex items-center justify-center text-3xl">
          🏛️
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {stages.map((s, i) => (
          <div key={s.key} className={`flex items-center gap-3 transition-all duration-300 ${i < currentIdx ? "opacity-40" : i === currentIdx ? "opacity-100" : "opacity-20"}`}>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${i < currentIdx ? "bg-white/20 border-white/20" : i === currentIdx ? "border-violet-400 bg-violet-400/10" : "border-white/10"}`}>
              {i < currentIdx ? (
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="text-white/60">
                  <path d="M5 12l5 5 9-9" />
                </svg>
              ) : i === currentIdx ? (
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              ) : null}
            </div>
            <span className={`text-xs ${i === currentIdx ? "text-white font-medium" : "text-white/30"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestedQuestions({
  questions,
  onSelect,
}: {
  questions: string[];
  onSelect: (q: string) => void;
}) {
  if (!questions.length) return null;
  return (
    <div className="mt-5">
      <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2.5">
        Suggested follow-ups
      </p>
      <div className="flex flex-col gap-2">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="text-left px-4 py-2.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 text-xs text-white/55 hover:text-white/80 transition-all duration-200 cursor-pointer leading-relaxed"
          >
            <span className="text-white/25 mr-2">↗</span>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function HistoryItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: BoardSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const isBoardroom = session.result.type === "boardroom";

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 ${isActive ? "bg-white/10 border border-white/15" : "hover:bg-white/5"}`}
      onClick={onSelect}
    >
      <span className="text-base shrink-0">{isBoardroom ? "🏛️" : "💬"}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs truncate ${isActive ? "text-white font-medium" : "text-white/60"}`}>
          {session.title}
        </p>
        <p className="text-[10px] text-white/25 mt-0.5">
          {isBoardroom ? "Full boardroom" : "Quick answer"}
          {session.result.creditsUsed > 0 && ` · −${session.result.creditsUsed} credits`}
        </p>
      </div>
      {hovering && (
        <button
          onClick={onDelete}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Delete"
        >
          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Paywall Modal ─────────────────────────────────────────────────────────────
const PAYWALL_TIERS = [
  {
    id: "basic",
    name: "Pro",
    price: "$1",
    badge: "Most Popular",
    badgeStyle: "bg-white text-black",
    description: "100 credits / day · 10 per session",
    features: ["Full boardroom sessions", "Landing page roasts", "Business Q&A", "Email support"],
    cta: "Get Pro →",
    ctaStyle: "bg-white text-black hover:bg-white/90",
  },
  {
    id: "pro",
    name: "Max",
    price: "$5",
    badge: "Best Value",
    badgeStyle: "bg-white/10 text-white border border-white/15",
    description: "500 credits / day · 5 per session",
    features: ["Everything in Pro", "~100 sessions / day", "Priority support", "Unlimited roasts"],
    cta: "Go Max →",
    ctaStyle: "bg-white/10 border border-white/20 text-white hover:bg-white/15",
  },
];

function PaywallModal({
  onClose,
  onUpgrade,
}: {
  onClose: () => void;
  onUpgrade: (tier: string) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl mx-4 mb-4 sm:mb-0 rounded-2xl border border-white/12 overflow-hidden"
        style={{
          background: "rgba(10,10,10,0.98)",
          backdropFilter: "blur(28px)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Violet glow top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌙</span>
              <h2 className="text-base font-black text-white tracking-tight">You&apos;re out of credits</h2>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Your daily credits have been used up. They reset at midnight — or upgrade now to keep going.
            </p>
          </div>
          <button
            id="paywall-modal-close-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all cursor-pointer shrink-0 ml-4"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Plans */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PAYWALL_TIERS.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border p-5 flex flex-col ${
                t.id === "basic" ? "border-white/20 bg-white/5" : "border-white/10 bg-white/2"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.badgeStyle}`}>
                  {t.badge}
                </span>
                <span className="text-xl font-black text-white">{t.price}<span className="text-xs text-white/30 font-normal">/mo</span></span>
              </div>
              <p className="text-sm font-bold text-white mb-1">{t.name}</p>
              <p className="text-[11px] text-white/35 mb-4 leading-relaxed">{t.description}</p>
              <ul className="flex flex-col gap-1.5 mb-5 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-white/55">
                    <svg className="w-3 h-3 shrink-0 text-white/30" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                id={`paywall-${t.id}-btn`}
                onClick={() => onUpgrade(t.id)}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.97] cursor-pointer ${t.ctaStyle}`}
              >
                {t.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 text-center">
          <p className="text-[11px] text-white/20">Credits reset daily at midnight · Cancel anytime</p>
          <button
            onClick={onClose}
            className="mt-2 text-[11px] text-white/25 hover:text-white/50 transition-colors cursor-pointer underline underline-offset-2"
          >
            Continue with free (wait until midnight)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function BoardroomContent() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [authed, setAuthed] = useState(false);
  const [tier, setTier] = useState<Tier>("basic");
  const [creditState, setCreditState] = useState<CreditState | null>(null);
  const [input, setInput] = useState("");
  const [activeInput, setActiveInput] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProUser, setIsProUser] = useState<boolean>(false);

  const [loadingStage, setLoadingStage] = useState("routing");
  const [error, setError] = useState("");
  const [activeResult, setActiveResult] = useState<SessionResult | null>(null);
  const [history, setHistory] = useState<BoardSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // On phones the 288px sidebar was eating almost the entire viewport,
  // leaving the boardroom itself an unusable sliver. Start collapsed there.
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  // Auth check
  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status === "authenticated") setAuthed(true);
  }, [status, router]);

  // Init credits + history — tier and pro status come from what was
  // actually paid for (server-checked), not the URL: ?tier=pro used to
  // hand out Pro-level limits to anyone who typed it in.
  useEffect(() => {
    if (!authed && status !== "authenticated") return;

    (async () => {
      let resolvedTier: Tier = "basic";
      try {
        const res = await fetch("/api/user/entitlement");
        const data = await res.json();
        if (!data.active) {
          router.replace("/paywall");
          return;
        }
        resolvedTier = data.tier === "pro" ? "pro" : "basic";
        setIsProUser(true);
      } catch {
        router.replace("/paywall");
        return;
      }
      setTier(resolvedTier);
      setCreditState(loadCreditState(resolvedTier));
      setHistory(loadHistory());
    })();
  }, [authed, status, router]);

  // Scroll to result
  useEffect(() => {
    if (activeResult) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [activeResult]);

  const saveSession = useCallback(
    (id: string, userInput: string, url: string, result: SessionResult, t: Tier) => {
      const title =
        userInput.length > 45 ? userInput.slice(0, 45) + "…" : userInput;
      const newSession: BoardSession = {
        id,
        title,
        tier: t,
        userInput,
        websiteUrl: url || undefined,
        result,
        createdAt: new Date().toISOString(),
      };
      const h = loadHistory();
      const updated = upsertSession(h, newSession);
      saveHistory(updated);
      setHistory(updated);
    },
    []
  );

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    // Guard: if already at 0 credits, show paywall immediately (don’t call API)
    if (creditState && creditState.tokens <= 0) {
      setShowPaywall(true);
      return;
    }

    setError("");
    setIsLoading(true);
    setLoadingStage("routing");
    setActiveResult(null);

    // Accumulators driven by real server signals (not guessed timers) so the
    // board members' text grows live on screen as each agent actually
    // generates it, instead of popping in all at once at the end.
    let believerText = "", skepticText = "", investorText = "", judgeText = "";
    let answerText = "";
    let resultType: "boardroom" | "answer" | null = null;
    let hasWebsiteFlag = false;
    let finalCreditsUsed = 0;
    let finalSuggested: string[] = [];
    let streamError = "";

    try {
      const res = await fetch("/api/boardroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startup_idea: text,
          website_url: websiteUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed.");
      }
      if (!res.body) throw new Error("Streaming isn't supported by this browser.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: { t: string; v?: string; agent?: string; hasWebsite?: boolean; creditsUsed?: number; suggestedQuestions?: string[]; websiteContext?: boolean };
          try { evt = JSON.parse(line); } catch { continue; }

          if (evt.t === "error") {
            streamError = evt.v ?? "Request failed.";
          } else if (evt.t === "answer") {
            resultType = "answer";
            answerText = evt.v ?? "";
            setIsLoading(false);
            setActiveResult({ type: "answer", reply: answerText, suggestedQuestions: [], creditsUsed: 1 });
          } else if (evt.t === "phase") {
            if (evt.v === "board") {
              resultType = "boardroom";
              hasWebsiteFlag = !!evt.hasWebsite;
              setIsLoading(false);
              setActiveResult({
                type: "boardroom", believer: "", skeptic: "", investor: "", judge: "",
                suggestedQuestions: [], creditsUsed: 0, websiteContext: hasWebsiteFlag,
              });
            } else {
              setLoadingStage(evt.v as string);
            }
          } else if (evt.t === "agent") {
            if (evt.agent === "believer") believerText += evt.v ?? "";
            else if (evt.agent === "skeptic") skepticText += evt.v ?? "";
            else if (evt.agent === "investor") investorText += evt.v ?? "";
            setActiveResult(prev =>
              prev && prev.type === "boardroom"
                ? { ...prev, believer: believerText, skeptic: skepticText, investor: investorText }
                : prev
            );
          } else if (evt.t === "judge") {
            judgeText += evt.v ?? "";
            setActiveResult(prev =>
              prev && prev.type === "boardroom" ? { ...prev, judge: judgeText } : prev
            );
          } else if (evt.t === "done") {
            finalCreditsUsed = evt.creditsUsed ?? (resultType === "answer" ? 1 : 0);
            finalSuggested = evt.suggestedQuestions ?? [];
            if (resultType === "boardroom" && evt.websiteContext !== undefined) {
              hasWebsiteFlag = evt.websiteContext;
            }
          }
        }
      }

      if (streamError) throw new Error(streamError);
      if (!resultType) throw new Error("AI returned an empty response.");

      const finalResult: SessionResult =
        resultType === "boardroom"
          ? {
              type: "boardroom", believer: believerText, skeptic: skepticText,
              investor: investorText, judge: judgeText, suggestedQuestions: finalSuggested,
              creditsUsed: finalCreditsUsed, websiteContext: hasWebsiteFlag,
            }
          : { type: "answer", reply: answerText, suggestedQuestions: finalSuggested, creditsUsed: finalCreditsUsed };

      setActiveResult(finalResult);
      setActiveInput(text);

      // Deduct credits
      const newTokens = Math.max(0, creditState!.tokens - finalResult.creditsUsed);
      const newState = { ...creditState!, tokens: newTokens };
      setCreditState(newState);
      saveCreditState(newState);

      // Save to history
      const sid = `board_${Date.now()}`;
      setActiveSessionId(sid);
      saveSession(sid, text, websiteUrl, finalResult, tier);
      setInput("");

      // Show paywall AFTER result renders if credits are now depleted
      if (newTokens <= 0) {
        setTimeout(() => setShowPaywall(true), 1800);
      }
    } catch (err) {
      setActiveResult(null);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSuggestedQuestion(q: string) {
    setInput(q);
    setActiveResult(null);
    setTimeout(() => inputRef.current?.focus(), 50);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleLoadSession(s: BoardSession) {
    setActiveResult(s.result);
    setActiveInput(s.userInput);
    setActiveSessionId(s.id);
    setWebsiteUrl(s.websiteUrl || "");
  }

  function handleDeleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const updated = history.filter((s) => s.id !== id);
    saveHistory(updated);
    setHistory(updated);
    if (id === activeSessionId) {
      setActiveResult(null);
      setActiveInput("");
      setActiveSessionId("");
    }
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  const depleted = creditState ? creditState.tokens < 1 : false;
  const userName = session?.user?.name ?? "User";
  const avatarUrl = session?.user?.image;
  const grouped = groupByDate(history);

  if (status === "loading" || (!authed && status !== "authenticated")) {
    return <BoardroomSkeleton />;
  }

  return (
    <div className="relative flex h-screen bg-black overflow-hidden">
      {/* Paywall Modal — renders over results after credits hit 0 */}
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onUpgrade={() => router.push("/paywall")}
        />
      )}
      {/* Scanner background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, opacity: 0.25 }}>
        <Scanner
          color1="#080808" color2="#1a1a1a" color3="#8b5cf6"
          speed={0.12} sweepSpeed={0.08} sweepWidth={3} sweepFalloff={3}
          scale={2} frequency={1.2} ripple={0.08} bandDensity={6}
          lineSharpness={7} glow={0.15} scanDirection="vertical"
          colorSpread={0.2} brightness={0.5} contrast={1.1} softness={2.5}
          vignette={0.75} scanline grain grainIntensity={0.025}
          opacity={1.0} mouseInteraction={false}
        />
      </div>
      <div className="fixed inset-0 bg-black/88 z-[1]" />

      {/* Mobile backdrop — sidebar is an overlay below md, not a layout push */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 md:z-20 flex flex-col border-r border-white/8 transition-transform md:transition-[width] duration-300 w-72 shrink-0 overflow-hidden ${
          sidebarOpen ? "translate-x-0 md:w-72" : "-translate-x-full md:translate-x-0 md:w-0"
        }`}
        style={{ background: "rgba(8,8,8,0.97)", backdropFilter: "blur(20px)" }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div>
            <span className="text-base font-black tracking-tight text-white">
              BRUTAL<span className="text-white/25">.</span>
            </span>
            <span className="ml-2 text-[10px] text-violet-400/80 font-semibold uppercase tracking-wider">
              Boardroom
            </span>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-xs text-white/30 hover:text-white transition-colors cursor-pointer"
          >
            ← Home
          </button>
        </div>

        {/* Credits */}
        <div className="px-5 py-3 border-b border-white/8 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-black">
                {TIER_CONFIG[tier].name}
              </span>
              <span className="text-[10px] text-white/30">{TIER_CONFIG[tier].price}</span>
            </div>
            <button
              onClick={() => router.push("/paywall")}
              className="text-[10px] text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Upgrade
            </button>
          </div>
          {creditState && (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/35">Daily credits</span>
                <span className={`text-xs font-black ${creditState.tokens <= 0 ? "text-red-400" : creditState.tokens < creditState.dailyLimit * 0.25 ? "text-yellow-400" : "text-white"}`}>
                  {creditState.tokens}
                  <span className="text-[10px] text-white/25 font-normal"> / {creditState.dailyLimit}</span>
                </span>
              </div>
              <div className="w-full h-1 rounded-full bg-white/8 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${creditState.tokens <= 0 ? "bg-red-500" : creditState.tokens < creditState.dailyLimit * 0.25 ? "bg-yellow-400" : "bg-violet-400"}`}
                  style={{ width: `${Math.max(0, (creditState.tokens / creditState.dailyLimit) * 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-white/20 mt-1">
                Dynamic cost: 1–17 credits/session · resets midnight
              </p>
            </>
          )}
        </div>

        {/* Switch to Chat */}
        <div className="px-4 py-3 border-b border-white/8 shrink-0">
          <button
            onClick={() => router.push("/chat")}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white/60 border border-white/10 hover:border-white/20 hover:text-white active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Switch to Chat
          </button>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto py-2 px-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <span className="text-3xl mb-2 opacity-20">🏛️</span>
              <p className="text-xs text-white/25 leading-relaxed">
                No sessions yet.<br />Submit an idea to begin.
              </p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest px-3 py-1.5">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((s) => (
                    <HistoryItem
                      key={s.id}
                      session={s}
                      isActive={s.id === activeSessionId}
                      onSelect={() => handleLoadSession(s)}
                      onDelete={(e) => handleDeleteSession(e, s.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* User */}
        <div className="px-5 py-4 border-t border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-white">
                {userName[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <button
                onClick={handleSignOut}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0"
          style={{ background: "rgba(8,8,8,0.94)", backdropFilter: "blur(20px)" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl">🏛️</span>
            <div>
              <span className="text-sm font-bold text-white">Virtual Boardroom</span>
              <span className="text-xs text-white/30 ml-2 hidden sm:inline">5 AI agents · Believer · Skeptic · Investor · Judge</span>
            </div>
          </div>

          {creditState && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shrink-0 ${depleted ? "border-red-500/30 bg-red-500/5 text-red-400" : "border-violet-500/20 bg-violet-500/5 text-violet-300"}`}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              {creditState.tokens} credits
            </div>
          )}
        </header>

        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">

          {/* Hero prompt section */}
          <div className="mb-8">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-xs font-medium text-violet-300/80 tracking-wide">
                  5-Agent AI Orchestration
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
                Pitch to the Board
              </h1>
              <p className="text-sm text-white/35 leading-relaxed max-w-lg mb-6">
                Describe your business idea. The Router classifies it, then three board members attack it simultaneously — and the Judge delivers the final verdict.
              </p>

              {/* Massive Upgrade to Pro Button */}
              {!isProUser && session?.user?.id && (
                <button
                  onClick={() => router.push("/paywall")}
                  className="inline-block w-full text-center px-8 py-4 mb-8 rounded-xl font-black text-lg bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:shadow-[0_0_50px_rgba(220,38,38,0.7)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-red-400/50 cursor-pointer"
                >
                  ⚡ UPGRADE TO PRO NOW ⚡
                </button>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleSubmit}>
              <div
                className={`rounded-2xl border p-4 transition-all duration-200 ${depleted ? "border-white/5 bg-white/[0.02] opacity-60" : "border-white/10 bg-white/[0.03] focus-within:border-violet-500/30"}`}
                style={{ backdropFilter: "blur(12px)" }}
              >
                <textarea
                  ref={inputRef}
                  id="boardroom-input"
                  rows={3}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={depleted || isLoading}
                  placeholder={
                    depleted
                      ? "Credits depleted — resets at midnight"
                      : "Describe your business idea… or ask the board a general question.\nE.g. 'An app that connects pet owners with on-demand dog trainers in their city.'"
                  }
                  className="w-full bg-transparent text-sm text-white placeholder-white/20 resize-none focus:outline-none leading-relaxed min-h-[72px] max-h-[200px] disabled:opacity-40"
                  style={{ scrollbarWidth: "none" }}
                />

                {/* URL chip area */}
                {showUrlInput && (
                  <div className="mt-3 pt-3 border-t border-white/8">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 bg-white/4 border border-white/10 rounded-xl px-3 py-2">
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-white/30 shrink-0">
                          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                        </svg>
                        <input
                          id="boardroom-url-input"
                          type="url"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="https://your-website.com (optional)"
                          className="flex-1 bg-transparent text-xs text-white placeholder-white/20 focus:outline-none"
                        />
                        {websiteUrl && (
                          <span className="text-[10px] text-violet-300/60 shrink-0">
                            Will be analysed
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShowUrlInput(false); setWebsiteUrl(""); }}
                        className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom row */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/6">
                  <div className="flex items-center gap-2">
                    {/* Attach URL button */}
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 cursor-pointer ${showUrlInput || websiteUrl ? "bg-violet-500/10 border border-violet-500/25 text-violet-300" : "text-white/30 hover:text-white/60 border border-transparent hover:border-white/10"}`}
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                      </svg>
                      {websiteUrl ? "URL attached" : "Add website"}
                    </button>
                    <span className="text-[10px] text-white/15">
                      Enter to submit · Shift+Enter for newline
                    </span>
                  </div>

                  <button
                    id="boardroom-submit-btn"
                    type="submit"
                    disabled={!input.trim() || depleted || isLoading}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm text-black bg-white hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-200 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Convening…
                      </>
                    ) : (
                      <>
                        🏛️ Convene the Board
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              <p className="text-xs text-red-300 flex-1">{error}</p>
              <button onClick={() => setError("")} className="text-red-400/50 hover:text-red-400 cursor-pointer">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && <LoadingStage stage={loadingStage} />}

          {/* Results */}
          {!isLoading && activeResult && (
            <div ref={resultRef}>
              {/* Session header */}
              <div className="mb-6 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  U
                </div>
                <div className="flex-1">
                  <div className="rounded-2xl bg-white text-black px-4 py-3 text-sm leading-relaxed inline-block max-w-full">
                    <p className="font-medium whitespace-pre-wrap">{activeInput}</p>
                    {activeResult.type === "boardroom" &&
                      (activeResult as BoardroomResult).websiteContext &&
                      websiteUrl && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-black/40">
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                          </svg>
                          {websiteUrl}
                        </div>
                      )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] text-white/20">
                      {activeResult.creditsUsed} credits used
                    </span>
                    {activeResult.type === "boardroom" && (
                      <span className="text-[10px] text-violet-400/50">· Full boardroom session</span>
                    )}
                  </div>
                </div>
              </div>

              {/* BOARDROOM VIEW — 4 persona cards */}
              {activeResult.type === "boardroom" && (() => {
                const r = activeResult as BoardroomResult;
                return (
                  <div className="space-y-6">
                    {/* Section label */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/6" />
                      <span className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Board Members</span>
                      <div className="flex-1 h-px bg-white/6" />
                    </div>

                    {/* Board members — always 3 equal columns from sm breakpoint up */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                      <PersonaCard personaKey="believer" content={r.believer} delay={0} index={1} />
                      <PersonaCard personaKey="skeptic" content={r.skeptic} delay={120} index={2} />
                      <PersonaCard personaKey="investor" content={r.investor} delay={240} index={3} />
                    </div>

                    {/* Visual separator before Judge */}
                    {!isProUser && (
                      <div className="my-6">
                        <AdBanner />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        <span className="text-[10px] text-violet-300/70 uppercase tracking-widest font-semibold">Board&apos;s Verdict</span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                    </div>

                    {/* Judge — full-width with violet glow aura */}
                    <div className="relative">
                      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-violet-500/25 via-purple-500/20 to-violet-500/25 blur-sm" />
                      <div className="relative">
                        <PersonaCard personaKey="judge" content={r.judge} delay={400} />
                      </div>
                    </div>

                    {/* Suggested questions */}
                    <SuggestedQuestions
                      questions={r.suggestedQuestions}
                      onSelect={handleSuggestedQuestion}
                    />
                  </div>
                );
              })()}

              {/* GENERAL ANSWER VIEW */}
              {activeResult.type === "answer" && (() => {
                const r = activeResult as AnswerResult;
                return (
                  <div>
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                        B
                      </div>
                      <div
                        className="flex-1 rounded-2xl rounded-tl-sm px-4 py-3 bg-white/5 border border-white/8 text-sm"
                        style={{ backdropFilter: "blur(12px)" }}
                      >
                        <article className="prose prose-invert prose-sm max-w-none
                          prose-headings:text-white prose-headings:font-bold prose-headings:mb-2
                          prose-p:text-white/80 prose-p:leading-relaxed prose-p:my-1
                          prose-li:text-white/80 prose-li:my-0.5 prose-strong:text-white
                          prose-ul:my-1 prose-ol:my-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <Markdown>{r.reply}</Markdown>
                        </article>
                      </div>
                    </div>

                    <div className="mt-1 pl-10">
                      <SuggestedQuestions
                        questions={r.suggestedQuestions}
                        onSelect={handleSuggestedQuestion}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !activeResult && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-6xl mb-4 opacity-30">🏛️</div>
              <h2 className="text-lg font-bold text-white/30 mb-2">The board awaits</h2>
              <p className="text-sm text-white/20 max-w-sm leading-relaxed">
                Describe your startup idea above. The Router will decide whether to answer directly or convene a full 4-agent board evaluation.
              </p>
              {/* Example chips */}
              <div className="mt-8 flex flex-col gap-2 max-w-md w-full">
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-semibold mb-1">
                  Try an example
                </p>
                {[
                  "An AI-powered meal planning app that auto-orders groceries based on your health goals",
                  "A marketplace connecting freelance surgeons with under-resourced rural hospitals",
                  "A B2B SaaS tool that auto-generates compliance reports from Slack conversations",
                ].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setInput(ex); inputRef.current?.focus(); }}
                    className="text-left px-4 py-2.5 rounded-xl border border-white/8 bg-white/2 hover:bg-white/5 hover:border-white/15 text-xs text-white/35 hover:text-white/60 transition-all duration-200 cursor-pointer leading-relaxed"
                  >
                    <span className="text-white/20 mr-2">→</span>{ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BoardroomPage() {
  return (
    <Suspense fallback={<BoardroomSkeleton />}>
      <BoardroomContent />
    </Suspense>
  );
}
