"use client";

import { useEffect, useState, useRef, FormEvent, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import Markdown from "react-markdown";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

// ─── Token System ────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  basic: { name: "Pro", price: "$1/mo", dailyTokens: 100, costPerMessage: 10 },
  pro:   { name: "Max", price: "$5/mo", dailyTokens: 500, costPerMessage: 5  },
} as const;
type Tier = keyof typeof TIER_CONFIG;

interface TokenState {
  tier: Tier; tokens: number; dailyLimit: number; lastReset: string;
}
function getTodayStr() { return new Date().toISOString().slice(0, 10); }
function loadTokenState(tier: Tier): TokenState {
  const today = getTodayStr();
  const config = TIER_CONFIG[tier];
  try {
    const raw = localStorage.getItem("brutal_tokens");
    if (raw) {
      const saved: TokenState = JSON.parse(raw);
      if (saved.lastReset !== today || saved.tier !== tier) {
        const fresh = { tier, tokens: config.dailyTokens, dailyLimit: config.dailyTokens, lastReset: today };
        localStorage.setItem("brutal_tokens", JSON.stringify(fresh)); return fresh;
      }
      return saved;
    }
  } catch {}
  const fresh = { tier, tokens: config.dailyTokens, dailyLimit: config.dailyTokens, lastReset: today };
  localStorage.setItem("brutal_tokens", JSON.stringify(fresh)); return fresh;
}
function saveTokenState(state: TokenState) {
  localStorage.setItem("brutal_tokens", JSON.stringify(state));
}

// ─── Chat History ─────────────────────────────────────────────────────────────
interface Message {
  id: string; role: "user" | "assistant"; content: string;
  tokensUsed?: number; timestamp: string; // ISO string for serialisability
}
interface ChatSession {
  id: string; title: string; tier: Tier;
  messages: Message[]; createdAt: string; updatedAt: string;
}
const HISTORY_KEY = "brutal_chat_history";
const MAX_SESSIONS = 50;

function loadHistory(): ChatSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch { return []; }
}
function saveHistory(sessions: ChatSession[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {}
}
function upsertSession(sessions: ChatSession[], session: ChatSession): ChatSession[] {
  const idx = sessions.findIndex(s => s.id === session.id);
  const updated = idx >= 0
    ? sessions.map((s, i) => (i === idx ? session : s))
    : [session, ...sessions];
  return updated.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
function deleteSession(sessions: ChatSession[], id: string): ChatSession[] {
  return sessions.filter(s => s.id !== id);
}
function groupByDate(sessions: ChatSession[]): { label: string; items: ChatSession[] }[] {
  const today = getTodayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const groups: Record<string, ChatSession[]> = {};
  for (const s of sessions) {
    const d = s.updatedAt.slice(0, 10);
    const label = d === today ? "Today" : d === yesterday ? "Yesterday" : d >= today.slice(0, 7) + "-01" ? "This Month" : "Older";
    (groups[label] ??= []).push(s);
  }
  const order = ["Today", "Yesterday", "This Month", "Older"];
  return order.filter(l => groups[l]).map(label => ({ label, items: groups[label] }));
}
function makeSessionTitle(firstUserMessage: string): string {
  return firstUserMessage.length > 42 ? firstUserMessage.slice(0, 42) + "…" : firstUserMessage;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const ts = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-6`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${isUser ? "bg-white text-black" : "bg-white/10 text-white border border-white/15"}`}>
        {isUser ? "U" : "B"}
      </div>
      <div className={`max-w-[78%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-white text-black rounded-tr-sm" : "bg-white/5 border border-white/8 text-white/85 rounded-tl-sm"}`}
          style={!isUser ? { backdropFilter: "blur(12px)" } : {}}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <article className="prose prose-invert prose-sm max-w-none
              prose-headings:text-white prose-headings:font-bold prose-headings:mb-2
              prose-p:text-white/80 prose-p:leading-relaxed prose-p:my-1
              prose-li:text-white/80 prose-li:my-0.5 prose-strong:text-white
              prose-code:text-white/80 prose-code:bg-white/10 prose-code:rounded prose-code:px-1 prose-code:text-xs
              prose-ul:my-1 prose-ol:my-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <Markdown>{msg.content}</Markdown>
            </article>
          )}
        </div>
        <span className="text-[10px] text-white/20 px-1">
          {ts}{msg.tokensUsed && isUser && <span className="ml-2 text-white/15">−{msg.tokensUsed} tokens</span>}
        </span>
      </div>
    </div>
  );
}

// ─── Thinking Panel ───────────────────────────────────────────────────────────
const THINKING_PHRASES = [
  "Reading the conversation context…",
  "Reasoning through the problem…",
  "Considering multiple angles…",
  "Checking what matters most…",
  "Formulating the best response…",
];

type ThinkingPhase = "thinking" | "revealing" | "gone";

function ThinkingPanel({
  phase,
  thoughts,
}: {
  phase: ThinkingPhase;
  thoughts: string;
}) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [mounted, setMounted] = useState(true);

  // Cycle placeholder phrases while Gemini is processing
  useEffect(() => {
    if (phase !== "thinking") return;
    const t = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % THINKING_PHRASES.length);
    }, 1800);
    return () => clearInterval(t);
  }, [phase]);

  // When phase reaches "gone", kick off fade then unmount
  useEffect(() => {
    if (phase === "gone") {
      const t = setTimeout(() => setMounted(false), 500);
      return () => clearTimeout(t);
    } else {
      setMounted(true);
    }
  }, [phase]);

  if (!mounted) return null;

  const isGone = phase === "gone";
  const isRevealing = phase === "revealing";

  return (
    <div
      className={`flex gap-3 mb-5 transition-all duration-500 ease-in-out ${
        isGone
          ? "opacity-0 -translate-y-2 scale-95 pointer-events-none"
          : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 border transition-colors duration-300 ${
          isRevealing
            ? "border-violet-500/30 bg-violet-500/10"
            : "border-white/10 bg-white/5"
        }`}
      >
        🧠
      </div>

      {/* Panel body */}
      <div
        className={`flex-1 rounded-2xl rounded-tl-sm border px-4 py-3 overflow-hidden transition-all duration-300 ${
          isRevealing
            ? "border-violet-500/20 bg-violet-500/4"
            : "border-white/8 bg-white/3"
        }`}
        style={{ backdropFilter: "blur(10px)" }}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2">
          {phase === "thinking" && (
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full bg-white/30 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}
          {isRevealing && (
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          )}
          <span
            className={`text-[10px] uppercase tracking-widest font-semibold transition-colors duration-300 ${
              isRevealing ? "text-violet-400/60" : "text-white/25"
            }`}
          >
            {isRevealing ? "Thought process" : "Thinking"}
          </span>
          {isRevealing && (
            <span className="ml-auto text-[9px] text-white/15">vanishes shortly…</span>
          )}
        </div>

        {/* Content */}
        {phase === "thinking" ? (
          <p
            key={phraseIdx}
            className="text-xs text-white/30 leading-relaxed animate-pulse"
          >
            {THINKING_PHRASES[phraseIdx]}
          </p>
        ) : (
          <p className="text-xs text-white/30 leading-relaxed whitespace-pre-wrap line-clamp-6">
            {thoughts || "Synthesising response…"}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar history item ─────────────────────────────────────────────────────
function HistoryItem({
  session, isActive, onSelect, onDelete,
}: {
  session: ChatSession; isActive: boolean;
  onSelect: () => void; onDelete: (e: React.MouseEvent) => void;
}) {
  const [hovering, setHovering] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 ${isActive ? "bg-white/10 border border-white/15" : "hover:bg-white/5"}`}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-xs truncate ${isActive ? "text-white font-medium" : "text-white/60"}`}>{session.title}</p>
        <p className="text-[10px] text-white/25 mt-0.5">
          {session.messages.filter(m => m.role === "user").length} messages
          {" · "}
          <span className="capitalize">{TIER_CONFIG[session.tier]?.name ?? session.tier}</span>
        </p>
      </div>
      {hovering && (
        <button
          onClick={onDelete}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Delete chat"
        >
          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function ChatContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url") || "";
  const sessionParam = searchParams.get("session") || "";

  const [authed, setAuthed] = useState(false);
  const [tier, setTier] = useState<Tier>("basic");
  const [tokenState, setTokenState] = useState<TokenState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState<ThinkingPhase>("gone");
  const [thinkingContent, setThinkingContent] = useState("");
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // On phones the 288px sidebar was eating almost the entire viewport,
  // leaving the chat itself an unusable sliver. Start collapsed there.
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  // Auth check
  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status === "authenticated") setAuthed(true);
  }, [status, router]);

  // Load history from localStorage on mount
  useEffect(() => {
    if (!authed && status !== "authenticated") return;
    const h = loadHistory();
    setHistory(h);
  }, [authed, status]);

  // Init: load specific session OR start fresh
  useEffect(() => {
    if (!authed && status !== "authenticated") return;

    (async () => {
      // The tier used to come straight from the URL (?tier=pro), which
      // meant anyone could type that in and get Pro limits for free.
      // Now it's read from what was actually paid for.
      let resolvedTier: Tier = "basic";
      try {
        const res = await fetch("/api/user/entitlement");
        const data = await res.json();
        if (!data.active) {
          router.replace("/paywall");
          return;
        }
        resolvedTier = data.tier === "pro" ? "pro" : "basic";
      } catch {
        router.replace("/paywall");
        return;
      }

      setTier(resolvedTier);
      const ts = loadTokenState(resolvedTier);
      setTokenState(ts);

      // If ?session=id is in URL, load that session
      if (sessionParam) {
        const h = loadHistory();
        const found = h.find(s => s.id === sessionParam);
        if (found) {
          setCurrentSessionId(found.id);
          setMessages(found.messages);
          setTier(found.tier);
          return;
        }
      }

      // Otherwise start a fresh new chat
      startNewChat(resolvedTier, ts, urlParam);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, status]);

  function startNewChat(t: Tier, ts: TokenState, url: string) {
    const newId = `chat_${Date.now()}`;
    setCurrentSessionId(newId);
    const welcomeText = url
      ? `Welcome! I can see you want to analyse **${url}**.\n\nI'm **Brutal** — your AI business & landing page expert. I've loaded your **${TIER_CONFIG[t].name}** plan (${ts.tokens} tokens today, ${TIER_CONFIG[t].costPerMessage}/msg).\n\nShall I start with a full teardown of that URL?`
      : `Welcome! I'm **Brutal** — your ruthless AI business strategist and landing page expert.\n\n**${TIER_CONFIG[t].name}** plan · **${ts.tokens} tokens** today · ${TIER_CONFIG[t].costPerMessage} tokens per message (resets midnight)\n\nAsk me anything: landing page teardowns, copy rewrites, CRO, pricing strategy, funnel analysis — or paste any URL.`;

    setMessages([{ id: "welcome", role: "assistant", content: welcomeText, timestamp: new Date().toISOString() }]);
    setError("");
  }

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Save current session to history whenever messages change (but skip welcome-only)
  const saveCurrentSession = useCallback((msgs: Message[], sessionId: string, t: Tier) => {
    const userMsgs = msgs.filter(m => m.role === "user");
    if (userMsgs.length === 0 || !sessionId) return;
    const title = makeSessionTitle(userMsgs[0].content);
    const now = new Date().toISOString();
    const newSession: ChatSession = {
      id: sessionId, title, tier: t, messages: msgs,
      createdAt: msgs[0].timestamp, updatedAt: now,
    };
    const h = loadHistory();
    const updated = upsertSession(h, newSession);
    saveHistory(updated);
    setHistory(updated);
  }, []);

  const config = TIER_CONFIG[tier];

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !tokenState || isTyping) return;

    if (tokenState.tokens < config.costPerMessage) {
      setError(`Not enough tokens. Need ${config.costPerMessage}, have ${tokenState.tokens}. Resets at midnight.`);
      return;
    }
    setError("");

    const newTokens = tokenState.tokens - config.costPerMessage;
    const newState = { ...tokenState, tokens: newTokens };
    setTokenState(newState);
    saveTokenState(newState);

    const userMsg: Message = {
      id: Date.now().toString(), role: "user", content: text,
      tokensUsed: config.costPerMessage, timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);
    setThinkingPhase("thinking");  // ← show thinking panel immediately
    setThinkingContent("");

    const apiMessages = updatedMessages
      .filter(m => m.id !== "welcome" && !m.id.startsWith("welcome"))
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, tier }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Request failed.");

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: data.reply, timestamp: new Date().toISOString(),
      };
      const finalMessages = [...updatedMessages, aiMsg];

      // ── Thinking panel state machine ──────────────────────────────────────
      if (data.thoughts) {
        // Phase 1: show real thoughts briefly
        setThinkingContent(data.thoughts);
        setThinkingPhase("revealing");
        setMessages(finalMessages);               // reply visible simultaneously
        saveCurrentSession(finalMessages, currentSessionId, tier);
        // Phase 2: fade out after 2 seconds
        setTimeout(() => setThinkingPhase("gone"), 2000);
      } else {
        // No thoughts returned — collapse panel immediately
        setThinkingPhase("gone");
        setMessages(finalMessages);
        saveCurrentSession(finalMessages, currentSessionId, tier);
      }
    } catch (err) {
      setThinkingPhase("gone");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleLoadSession(s: ChatSession) {
    setCurrentSessionId(s.id);
    setMessages(s.messages);
    setTier(s.tier);
    const ts = loadTokenState(s.tier);
    setTokenState(ts);
    setError("");
    setSidebarOpen(true);
  }

  function handleDeleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const updated = deleteSession(history, id);
    saveHistory(updated);
    setHistory(updated);
    // If deleting current session, start fresh
    if (id === currentSessionId) {
      const ts = tokenState ?? loadTokenState(tier);
      startNewChat(tier, ts, "");
    }
  }

  function handleNewChat() {
    const ts = loadTokenState(tier);
    setTokenState(ts);
    startNewChat(tier, ts, "");
    setSidebarOpen(true);
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  const depleted = tokenState ? tokenState.tokens < config.costPerMessage : false;
  const lowTokens = tokenState ? !depleted && tokenState.tokens < tokenState.dailyLimit * 0.25 : false;
  const userName = session?.user?.name ?? "User";
  const avatarUrl = session?.user?.image;
  const grouped = groupByDate(history);

  if (status === "loading" || (!authed && status !== "authenticated")) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen bg-black overflow-hidden">
      {/* Scanner background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, opacity: 0.35 }}>
        <Scanner color1="#080808" color2="#1a1a1a" color3="#ffffff" speed={0.15} sweepSpeed={0.1}
          sweepWidth={2.5} sweepFalloff={4} scale={1.8} frequency={1.5} ripple={0.12}
          bandDensity={8} lineSharpness={6.5} glow={0.12} scanDirection="vertical"
          colorSpread={0.3} brightness={0.6} contrast={1.1} softness={2.0} vignette={0.7}
          scanline grain grainIntensity={0.03} opacity={1.0} mouseInteraction={false} />
      </div>
      <div className="fixed inset-0 bg-black/85 z-[1]" />

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
        {/* Brand + home */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <span className="text-base font-black tracking-tight text-white">BRUTAL<span className="text-white/25">.</span></span>
          <button onClick={() => router.push("/")} className="text-xs text-white/30 hover:text-white transition-colors cursor-pointer">← Home</button>
        </div>

        {/* Plan + tokens */}
        <div className="px-5 py-3 border-b border-white/8 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-black">{config.name}</span>
              <span className="text-[10px] text-white/30">{config.price}</span>
            </div>
            <button onClick={() => router.push("/paywall")} className="text-[10px] text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors cursor-pointer">Upgrade</button>
          </div>
          {tokenState && (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/35">Daily tokens</span>
                <span className={`text-xs font-black ${tokenState.tokens <= 0 ? "text-red-400" : tokenState.tokens < tokenState.dailyLimit * 0.25 ? "text-yellow-400" : "text-white"}`}>
                  {tokenState.tokens}<span className="text-[10px] text-white/25 font-normal"> / {tokenState.dailyLimit}</span>
                </span>
              </div>
              <div className="w-full h-1 rounded-full bg-white/8 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${tokenState.tokens <= 0 ? "bg-red-500" : tokenState.tokens < tokenState.dailyLimit * 0.25 ? "bg-yellow-400" : "bg-white"}`}
                  style={{ width: `${Math.max(0, (tokenState.tokens / tokenState.dailyLimit) * 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-white/20 mt-1">{config.costPerMessage} tokens/msg · resets midnight</p>
            </>
          )}
        </div>

        {/* New chat button */}
        <div className="px-4 py-3 border-b border-white/8 shrink-0">
          <button
            id="new-chat-btn"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-white/90 active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Chat history list */}
        <div className="flex-1 overflow-y-auto py-2 px-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <svg className="w-8 h-8 text-white/10 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-xs text-white/25 leading-relaxed">No previous chats.<br />Start a conversation!</p>
            </div>
          ) : (
            grouped.map(group => (
              <div key={group.label} className="mb-3">
                <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest px-3 py-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map(s => (
                    <HistoryItem
                      key={s.id}
                      session={s}
                      isActive={s.id === currentSessionId}
                      onSelect={() => handleLoadSession(s)}
                      onDelete={(e) => handleDeleteSession(e, s.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-t border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" />
              : <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-white">{userName[0]?.toUpperCase() ?? "U"}</div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <button id="chat-signout-btn" onClick={handleSignOut} className="text-[10px] text-white/30 hover:text-white/60 transition-colors cursor-pointer">Sign out</button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0"
          style={{ background: "rgba(8,8,8,0.92)", backdropFilter: "blur(20px)" }}>
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Brutal AI</span>
            <span className="text-xs text-white/30 hidden sm:block shrink-0">— Business & Landing Page Expert</span>
          </div>

          {/* Token badge */}
          {tokenState && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shrink-0 ${depleted ? "border-red-500/30 bg-red-500/5 text-red-400" : "border-white/10 bg-white/5 text-white/55"}`}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              {tokenState.tokens} tokens
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
          <div className="max-w-3xl mx-auto">
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            {(isTyping || thinkingPhase !== "gone") && (
              <ThinkingPanel
                phase={isTyping ? "thinking" : thinkingPhase}
                thoughts={thinkingContent}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mb-2 px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/15 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            <p className="text-xs text-red-300 flex-1">{error}</p>
            <button onClick={() => setError("")} className="text-red-400/50 hover:text-red-400 cursor-pointer shrink-0">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Low tokens nudge — fires before depletion, not after */}
        {lowTokens && tier === "basic" && (
          <div className="mx-4 mb-2 px-4 py-3 rounded-xl bg-white/3 border border-white/10 text-center">
            <p className="text-xs text-white/50 mb-2">
              ⚡ {Math.floor(tokenState!.tokens / config.costPerMessage)} messages left today. Pro gives you 5x more.
            </p>
            <button onClick={() => router.push("/paywall")} className="text-xs font-semibold text-white underline underline-offset-2 hover:no-underline cursor-pointer">
              Upgrade to Pro →
            </button>
          </div>
        )}

        {/* Depleted banner */}
        {depleted && (
          <div className="mx-4 mb-2 px-4 py-3 rounded-xl bg-white/3 border border-white/10 text-center">
            <p className="text-xs text-white/50 mb-2">🌙 You&apos;ve used all your tokens for today. They reset at midnight.</p>
            <button onClick={() => router.push("/paywall")} className="text-xs font-semibold text-white underline underline-offset-2 hover:no-underline cursor-pointer">
              Upgrade for more tokens →
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="px-4 pb-6 pt-2 shrink-0" style={{ background: "rgba(8,8,8,0.92)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSend}>
              <div
                className={`flex items-end gap-3 rounded-2xl border p-3 transition-all duration-200 ${depleted ? "border-white/5 bg-white/[0.02] opacity-60" : "border-white/10 bg-white/[0.04] focus-within:border-white/20"}`}
                style={{ backdropFilter: "blur(12px)" }}
              >
                <textarea
                  ref={inputRef}
                  id="chat-input"
                  rows={1}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={depleted || isTyping}
                  placeholder={depleted ? "Tokens depleted — resets at midnight" : "Ask anything about your business or paste a URL…"}
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/20 resize-none focus:outline-none leading-relaxed min-h-[24px] max-h-[160px] disabled:opacity-40"
                  style={{ scrollbarWidth: "none" }}
                />
                <button
                  id="chat-send-btn"
                  type="submit"
                  disabled={!input.trim() || depleted || isTyping}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isTyping ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-white/15 text-center mt-2">
                Enter to send · Shift+Enter for new line · {config.costPerMessage} tokens/message
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
