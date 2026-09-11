import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";

// ─── LLM Client Factory ───────────────────────────────────────────────────────
function getModel(systemInstruction: string) {
  const apiKey = process.env.GEMINI_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
  });
}

// ─── Agent System Instructions ────────────────────────────────────────────────
const ROUTER_INSTRUCTION =
  "You are a routing agent. If the user asks a general question, answer it concisely. " +
  "If the user presents a business idea, respond ONLY with the exact word 'EVALUATE'. " +
  "A business idea is anything describing a product, service, startup concept, app idea, or venture. " +
  "A general question is anything that is not a business idea description. Be decisive.";

const BELIEVER_INSTRUCTION =
  "You are the Believer. You are an optimistic visionary who champions bold ideas. " +
  "Explain exactly why this business idea is brilliant, how it could change the world, " +
  "and identify the exact desperate target audience who will love it. " +
  "Give specific, vivid reasons. Be passionate and concrete. Use Markdown formatting with headers and bullet points.";

const SKEPTIC_INSTRUCTION =
  "You are the Skeptic. You are a paranoid, pessimistic risk analyst. " +
  "Attack every single weak point of this idea without mercy. Tell the user exactly why this will fail, " +
  "who the specific competitors are that will crush them, what hidden flaws they are ignoring, " +
  "and what market realities they are naive about. Be brutally honest and specific. " +
  "Use Markdown formatting with headers and bullet points.";

const INVESTOR_INSTRUCTION =
  "You are the Investor. You only care about money, margins, and scalability. " +
  "Break down the unit economics of this idea. How exactly does this make money? " +
  "Analyze the Customer Acquisition Cost vs Lifetime Value dynamic. " +
  "Discuss market size (TAM/SAM/SOM). Is this a lifestyle business or a billion-dollar unicorn? " +
  "Give real numbers and realistic projections. Use Markdown formatting with headers and bullet points.";

const JUDGE_INSTRUCTION =
  "You are the Judge, a veteran startup CEO with 20+ years of building and exiting companies. " +
  "You have just received an idea, plus an optimistic pitch (The Believer), a pessimistic takedown (The Skeptic), " +
  "and a financial breakdown (The Investor). Synthesize these conflicting reports into a definitive verdict. " +
  "Output a clean Markdown response containing exactly these three sections: " +
  "## 🏛️ Board Debate Summary\n" +
  "## ⚠️ Most Critical Risk to Solve First\n" +
  "## 🔨 Final Verdict\n" +
  "The verdict must be one of: **BUILD IT** / **PIVOT FIRST** / **DO NOT BUILD**. " +
  "Be decisive, direct, and authoritative. No hedging.";

const SUGGEST_INSTRUCTION =
  "You are a strategic business coach. Based on the context provided (a business idea and the board's analysis), " +
  "generate exactly 3 sharp, thought-provoking follow-up questions that would help the founder " +
  "dig deeper into the most important unresolved issues. " +
  "Return ONLY a JSON array of 3 question strings, nothing else. Example: " +
  '[\"Question 1?\", \"Question 2?\", \"Question 3?\"]';

const SUGGEST_GENERAL_INSTRUCTION =
  "You are a business strategy assistant. Based on the conversation context, " +
  "generate exactly 3 follow-up questions that logically extend the discussion. " +
  "Return ONLY a JSON array of 3 question strings, nothing else. Example: " +
  '[\"Question 1?\", \"Question 2?\", \"Question 3?\"]';

// ─── Website Fetcher ──────────────────────────────────────────────────────────
// Best-effort SSRF guard: this fetches whatever URL the client sends,
// server-side, with no proxy in front of it (unlike /api/roast, which goes
// through Jina). Without this, someone could point website_url at
// 169.254.169.254 (cloud metadata), localhost, or an internal/private
// address. This blocks literal internal hostnames/IPs; it doesn't defend
// against DNS rebinding (a hostname that resolves to a private IP only at
// fetch time), which would need resolving the DNS record before fetching.
function isSafeExternalUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") {
    return false;
  }
  if (host === "169.254.169.254") return false; // cloud metadata endpoint

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 10 || a === 127) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  return true;
}

async function fetchWebsiteText(url: string): Promise<string> {
  if (!isSafeExternalUrl(url)) return "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BrutalBot/1.0)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const html = await res.text();
    // Strip HTML tags and collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000); // limit to ~6k chars to keep prompt tight
    return text;
  } catch {
    return "";
  }
}

// ─── Dynamic Credit Calculator ────────────────────────────────────────────────
function calculateCredits(
  type: "answer" | "boardroom",
  outputs: string[],
  hasWebsite: boolean
): number {
  if (type === "answer") return 1;
  const totalChars = outputs.reduce((sum, s) => sum + s.length, 0);
  const base = Math.max(5, Math.min(15, Math.ceil(totalChars / 500)));
  return hasWebsite ? Math.min(17, base + 2) : base;
}

// ─── Suggested Questions Helper ───────────────────────────────────────────────
async function generateSuggestedQuestions(
  prompt: string,
  isGeneral: boolean
): Promise<string[]> {
  try {
    const model = getModel(
      isGeneral ? SUGGEST_GENERAL_INSTRUCTION : SUGGEST_INSTRUCTION
    );
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3).map(String);
      }
    }
    return [];
  } catch {
    return [];
  }
}

// ─── Request Types ────────────────────────────────────────────────────────────
type RequestBody = {
  startup_idea: string;
  website_url?: string;
};

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = session.user.id;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const startupIdea = body.startup_idea?.trim();
  const websiteUrl = body.website_url?.trim() || "";

  if (!startupIdea) {
    return NextResponse.json(
      { error: "startup_idea is required." },
      { status: 400 }
    );
  }

  // ── STEP 1: Router Agent ──────────────────────────────────────────────────
  // Not streamed: its own output IS the general-answer reply, and we can't
  // tell whether it's about to say the literal word "EVALUATE" until it's
  // done, so there's nothing useful to show live for this short, fast call.
  let routerResponse: string;
  try {
    const routerModel = getModel(ROUTER_INSTRUCTION);
    const routerResult = await routerModel.generateContent(startupIdea);
    routerResponse = routerResult.response.text().trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Router agent failed: ${msg}` },
      { status: 500 }
    );
  }

  // Everything past this point streams newline-delimited JSON events so the
  // client can render the board members' (and judge's) text as it's
  // generated, and show real phase progress instead of guessed timers:
  // {"t":"answer","v":"..."} | {"t":"phase","v":"scraping"|"board"|"judge",hasWebsite?} |
  // {"t":"agent","agent":"believer"|"skeptic"|"investor","v":"..."} | {"t":"judge","v":"..."} |
  // {"t":"done",creditsUsed,suggestedQuestions,websiteContext?} | {"t":"error","v":"..."}
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        // ── GENERAL ANSWER PATH ───────────────────────────────────────────
        if (routerResponse !== "EVALUATE") {
          send({ t: "answer", v: routerResponse });
          const suggestedQuestions = await generateSuggestedQuestions(
            `User asked: "${startupIdea}"\nAssistant answered: "${routerResponse}"\nGenerate 3 follow-up questions.`,
            true
          );
          send({ t: "done", creditsUsed: 1, suggestedQuestions });
          return;
        }

        // ── STEP 2: Fetch Website Context (optional) ────────────────────
        let websiteContext = "";
        let hasWebsite = false;
        if (websiteUrl) {
          send({ t: "phase", v: "scraping" });
          websiteContext = await fetchWebsiteText(websiteUrl);
          hasWebsite = !!websiteContext;
        }

        const ideaContext = hasWebsite
          ? `Business Idea: ${startupIdea}\n\nWebsite Content (${websiteUrl}):\n${websiteContext}`
          : startupIdea;

        send({ t: "phase", v: "board", hasWebsite });

        // ── STEP 3: Parallel Boardroom (3 agents streaming simultaneously) ─
        async function streamAgent(
          agent: "believer" | "skeptic" | "investor",
          instruction: string
        ): Promise<string> {
          const result = await getModel(instruction).generateContentStream(ideaContext);
          let full = "";
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (!text) continue;
            full += text;
            send({ t: "agent", agent, v: text });
          }
          return full.trim();
        }

        let believerOutput: string, skepticOutput: string, investorOutput: string;
        try {
          [believerOutput, skepticOutput, investorOutput] = await Promise.all([
            streamAgent("believer", BELIEVER_INSTRUCTION),
            streamAgent("skeptic", SKEPTIC_INSTRUCTION),
            streamAgent("investor", INVESTOR_INSTRUCTION),
          ]);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          send({ t: "error", v: `Board agents failed: ${msg}` });
          return;
        }

        // ── STEP 4: Judge (Synthesizer, streamed) ────────────────────────
        send({ t: "phase", v: "judge" });

        const judgePrompt = `
## The Business Idea
${startupIdea}
${hasWebsite ? `\n## Website Context (${websiteUrl})\n${websiteContext.slice(0, 1500)}` : ""}

## The Believer's Report
${believerOutput}

## The Skeptic's Report
${skepticOutput}

## The Investor's Report
${investorOutput}
`.trim();

        let judgeOutput = "";
        try {
          const judgeResult = await getModel(JUDGE_INSTRUCTION).generateContentStream(judgePrompt);
          for await (const chunk of judgeResult.stream) {
            const text = chunk.text();
            if (!text) continue;
            judgeOutput += text;
            send({ t: "judge", v: text });
          }
          judgeOutput = judgeOutput.trim();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          send({ t: "error", v: `Judge agent failed: ${msg}` });
          return;
        }

        // ── STEP 5: Save to Supabase Chats Table ─────────────────────────
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          process.env.SUPABASE_SERVICE_ROLE_KEY || ""
        );

        const { error: dbError } = await supabaseAdmin.from("chats").insert({
          user_id: userId,
          startup_idea: startupIdea,
          believer_response: believerOutput,
          skeptic_response: skepticOutput,
          investor_response: investorOutput,
          judge_verdict: judgeOutput,
        });

        if (dbError) {
          console.error("Failed to insert chat into Supabase:", dbError);
          // Continue execution so user still gets their answer even if logging fails
        }

        // ── STEP 6: Suggested Questions ───────────────────────────────────
        const suggestPrompt = `
Business Idea: "${startupIdea}"
${hasWebsite ? `Website: ${websiteUrl}` : ""}
Judge's Verdict: "${judgeOutput.slice(0, 800)}"
Generate 3 follow-up questions for the founder.
`.trim();

        const suggestedQuestions = await generateSuggestedQuestions(
          suggestPrompt,
          false
        );

        // ── STEP 7: Dynamic Credit Calculation ────────────────────────────
        const creditsUsed = calculateCredits(
          "boardroom",
          [believerOutput, skepticOutput, investorOutput, judgeOutput],
          hasWebsite
        );

        send({ t: "done", creditsUsed, suggestedQuestions, websiteContext: hasWebsite });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error.";
        send({ t: "error", v: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
