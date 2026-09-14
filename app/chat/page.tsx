"use client";

import { useEffect, useState, useRef, FormEvent, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import Markdown from "react-markdown";
import { Skeleton } from "@/components/Skeleton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Logo } from "@/components/Logo";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

function ChatSkeleton() {
  return (
    <div className="relative flex h-screen bg-black overflow-hidden">
      <aside className="hidden md:flex flex-col w-72 border-r border-white/8 shrink-0 p-4 gap-3">
        <Skeleton className="h-6 w-24 mb-2" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex flex-col gap-2 mt-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-3/4 rounded-lg" />
        </div>
      </aside>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex-1 px-4 py-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <Skeleton className="h-20 w-2/3 rounded-2xl" />
            <Skeleton className="h-14 w-1/2 rounded-2xl self-end" />
            <Skeleton className="h-24 w-3/4 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function getTodayStr() { return new Date().toISOString().slice(0, 10); }

// ─── Chat History ─────────────────────────────────────────────────────────────
interface Message {
  id: string; role: "user" | "assistant"; content: string;
  timestamp: string; // ISO string for serialisability
}
interface ChatSession {
  id: string; title: string;
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
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-white/20">{ts}</span>
          {!isUser && (
            <button onClick={handleCopy} className="text-[10px] text-white/20 hover:text-white/50 transition-colors cursor-pointer">
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const [failedRetry, setFailedRetry] = useState<{ apiMessages: { role: string; content: string }[] } | null>(null);

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

    // If ?session=id is in URL, load that session
    if (sessionParam) {
      const h = loadHistory();
      const found = h.find(s => s.id === sessionParam);
      if (found) {
        setCurrentSessionId(found.id);
        setMessages(found.messages);
        return;
      }
    }

    // Otherwise start a fresh new chat
    startNewChat(urlParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, status]);

  function startNewChat(url: string) {
    const newId = `chat_${Date.now()}`;
    setCurrentSessionId(newId);
    const welcomeText = url
      ? `Welcome! I can see you want to analyse **${url}**.\n\nI'm **Brutal** — your AI business & landing page expert.\n\nShall I start with a full teardown of that URL?`
      : `Welcome! I'm **Brutal** — your ruthless AI business strategist and landing page expert.\n\nAsk me anything: landing page teardowns, copy rewrites, CRO, pricing strategy, funnel analysis — or paste any URL.`;

    setMessages([{ id: "welcome", role: "assistant", content: welcomeText, timestamp: new Date().toISOString() }]);
    setError("");
  }

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Save current session to history whenever messages change (but skip welcome-only)
  const saveCurrentSession = useCallback((msgs: Message[], sessionId: string) => {
    const userMsgs = msgs.filter(m => m.role === "user");
    if (userMsgs.length === 0 || !sessionId) return;
    const title = makeSessionTitle(userMsgs[0].content);
    const now = new Date().toISOString();
    const newSession: ChatSession = {
      id: sessionId, title, messages: msgs,
      createdAt: msgs[0].timestamp, updatedAt: now,
    };
    const h = loadHistory();
    const updated = upsertSession(h, newSession);
    saveHistory(updated);
    setHistory(updated);
  }, []);

  // Streams the assistant's reply for a given message history. Split out of
  // handleSend so a failed turn can be retried without re-sending the user's
  // message.
  async function runAssistantTurn(apiMessages: { role: string; content: string }[]) {
    setIsTyping(true);
    setThinkingPhase("thinking");  // ← show thinking panel immediately
    setThinkingContent("");
    setError("");
    setFailedRetry(null);

    const aiMsgId = (Date.now() + 1).toString();
    let replyText = "";
    let thoughtsText = "";
    let sawReplyText = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed.");
      }
      if (!res.body) throw new Error("Streaming isn't supported by this browser.");

      // Read the NDJSON stream and grow the assistant bubble live as text
      // arrives, instead of waiting for the whole reply before showing anything.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: { t: string; v: string };
          try { evt = JSON.parse(line); } catch { continue; }

          if (evt.t === "error") {
            streamError = evt.v;
          } else if (evt.t === "thought") {
            thoughtsText += evt.v;
            setThinkingContent(thoughtsText);
          } else if (evt.t === "text") {
            if (!sawReplyText) {
              // First real text chunk — collapse the thinking panel (revealing
              // the captured thoughts briefly first) so the growing reply
              // bubble becomes the visible "live generating" moment.
              sawReplyText = true;
              if (thoughtsText.trim()) {
                setThinkingPhase("revealing");
                setTimeout(() => setThinkingPhase("gone"), 1200);
              } else {
                setThinkingPhase("gone");
              }
            }
            replyText += evt.v;
            const liveText = replyText;
            setMessages(prev => {
              const exists = prev.some(m => m.id === aiMsgId);
              if (exists) {
                return prev.map(m => (m.id === aiMsgId ? { ...m, content: liveText } : m));
              }
              return [...prev, {
                id: aiMsgId, role: "assistant", content: liveText,
                timestamp: new Date().toISOString(),
              }];
            });
          }
        }
      }

      if (streamError) throw new Error(streamError);
      if (!sawReplyText) throw new Error("AI returned an empty response.");

      setThinkingPhase("gone");
      setMessages(prev => {
        const finalMessages = prev.map(m =>
          m.id === aiMsgId ? { ...m, content: replyText.trim() } : m
        );
        saveCurrentSession(finalMessages, currentSessionId);
        return finalMessages;
      });
    } catch (err) {
      setThinkingPhase("gone");
      if (controller.signal.aborted) {
        // User hit "stop" — keep whatever partial reply already rendered.
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, content: replyText.trim() || "*(stopped)*" } : m
        ));
      } else {
        // Drop the partial assistant bubble on a real failure rather than
        // leaving a half-written message, and offer to retry this turn.
        setMessages(prev => prev.filter(m => m.id !== aiMsgId));
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setFailedRetry({ apiMessages });
      }
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isTyping) return;

    setError("");

    const userMsg: Message = {
      id: Date.now().toString(), role: "user", content: text,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");

    const apiMessages = updatedMessages
      .filter(m => m.id !== "welcome" && !m.id.startsWith("welcome"))
      .map(m => ({ role: m.role, content: m.content }));

    await runAssistantTurn(apiMessages);
  }

  function handleStopGenerating() {
    abortControllerRef.current?.abort();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleLoadSession(s: ChatSession) {
    setCurrentSessionId(s.id);
    setMessages(s.messages);
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
      startNewChat("");
    }
  }

  function handleNewChat() {
    startNewChat("");
    setSidebarOpen(true);
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  const userName = session?.user?.name ?? "User";
  const avatarUrl = session?.user?.image;
  const grouped = groupByDate(history);

  if (status === "loading" || (!authed && status !== "authenticated")) {
    return <ChatSkeleton />;
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
          <span className="flex items-center gap-2 text-base font-black tracking-tight text-white">
            <Logo size={16} />
            BRUTAL<span className="text-white/25">.</span>
          </span>
          <button onClick={() => router.push("/")} className="text-xs text-white/30 hover:text-white transition-colors cursor-pointer">← Home</button>
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
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
          <div className="max-w-3xl mx-auto">
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            {thinkingPhase !== "gone" && (
              <ThinkingPanel phase={thinkingPhase} thoughts={thinkingContent} />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mb-2">
            <ErrorBanner
              message={error}
              onDismiss={() => setError("")}
              actionLabel={failedRetry ? "Retry" : undefined}
              onAction={failedRetry ? () => runAssistantTurn(failedRetry.apiMessages) : undefined}
            />
          </div>
        )}

        {/* Input area */}
        <div className="px-4 pb-6 pt-2 shrink-0" style={{ background: "rgba(8,8,8,0.92)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSend}>
              <div
                className="flex items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.04] focus-within:border-white/20 p-3 transition-all duration-200"
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
                  disabled={isTyping}
                  placeholder="Ask anything about your business or paste a URL…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/20 resize-none focus:outline-none leading-relaxed min-h-[24px] max-h-[160px] disabled:opacity-40"
                  style={{ scrollbarWidth: "none" }}
                />
                <button
                  id="chat-send-btn"
                  type={isTyping ? "button" : "submit"}
                  onClick={isTyping ? handleStopGenerating : undefined}
                  disabled={!isTyping && !input.trim()}
                  title={isTyping ? "Stop generating" : "Send"}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isTyping ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-white/15 text-center mt-2">
                Enter to send · Shift+Enter for new line
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
    <Suspense fallback={<ChatSkeleton />}>
      <ChatContent />
    </Suspense>
  );
}
