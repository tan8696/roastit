import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEntitlement } from "@/lib/entitlement";

const SYSTEM_INSTRUCTION =
  "You are Brutal — a ruthless, world-class direct-response copywriter, business strategist, and landing page conversion expert. " +
  "You give honest, data-driven, no-fluff advice. You specialise in: " +
  "landing page teardowns, conversion rate optimisation (CRO), copywriting, UX critique, pricing strategy, business model critique, funnel analysis, and growth marketing. " +
  "Be direct, specific, and actionable. Use bullet points where helpful. Never pad your answers. " +
  "If the user gives you a URL, analyse it ruthlessly. If they ask a business question, give a real expert answer. " +
  "Format your responses in clean markdown when appropriate.";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  messages?: unknown;
  tier?: string;
};

export async function POST(request: Request) {
  // The /chat page redirects unpaid users to /paywall, but that's just
  // client-side routing — without this, anyone could call this endpoint
  // directly and get free, unlimited Gemini access.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { active } = await getEntitlement(session.user.id);
  if (!active) {
    return NextResponse.json({ error: "An active plan is required." }, { status: 402 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server is missing GEMINI_API_KEY." }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required." }, { status: 400 });
  }

  // Build conversation history for Gemini
  const history = (messages as Message[]).slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = (messages as Message[]).at(-1);
  if (!lastMessage || lastMessage.role !== "user") {
    return NextResponse.json({ error: "Last message must be from user." }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      // Enable Gemini's native thinking mode — exposes chain-of-thought tokens
      generationConfig: {
        thinkingConfig: {
          thinkingBudget: 8192,
        },
      } as Record<string, unknown>,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);

    // ── Separate thought tokens from the final reply ───────────────────────
    let thoughts = "";
    let reply = "";

    try {
      const parts = result.response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        // Gemini marks chain-of-thought parts with thought: true
        const p = part as { text?: string; thought?: boolean };
        if (p.thought && p.text) {
          thoughts += p.text;
        } else if (p.text) {
          reply += p.text;
        }
      }
    } catch {
      // parts parsing failed — fall through to text() helper
    }

    // Fallback if parts extraction yielded nothing
    if (!reply) reply = result.response.text().trim();
    reply = reply.trim();

    if (!reply) {
      return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
    }

    // Return both reply and thoughts; thoughts may be empty if model skips thinking
    return NextResponse.json({ reply, thoughts: thoughts.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: `AI request failed: ${message}` }, { status: 500 });
  }
}
