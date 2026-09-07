import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getEntitlement } from "@/lib/entitlement";

const JINA_READER_BASE = "https://r.jina.ai/";
const MAX_MARKDOWN_CHARS = 80_000;
const SCRAPE_TIMEOUT_MS = 25_000;

// ponytail: one free roast per browser via an httpOnly cookie — trivially
// bypassable (incognito, clearing cookies). Good enough for a marketing-page
// teaser; upgrade to IP + Supabase-backed counting if Groq usage shows abuse.
const FREE_ROAST_COOKIE = "brutal_free_roast";
const FREE_ROAST_MAX_AGE_S = 60 * 60 * 24; // 24h

const SYSTEM_INSTRUCTION =
  "You are a ruthless, highly expensive direct-response copywriter and UX expert. " +
  "The user will provide scraped text from a landing page. Tear it apart. " +
  "Output clean Markdown with exactly three sections:\n" +
  "## 1. The Brutal Truth\n" +
  "Why this landing page fails — be specific, be merciless, cite real evidence from the scraped text.\n\n" +
  "## 2. The UX Friction\n" +
  "Bullet points of every weak trust signal, confusing copy, missing CTA, visual hierarchy failure, or conversion killer you find.\n\n" +
  "## 3. The Rewrite\n" +
  "A high-converting hero headline, subheadline, and primary CTA button text — rewritten from scratch. " +
  "Make it clear, benefit-driven, and irresistible. No fluff.";

type RoastRequestBody = {
  url?: unknown;
};

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function truncateMarkdown(markdown: string): string {
  if (markdown.length <= MAX_MARKDOWN_CHARS) {
    return markdown;
  }
  return `${markdown.slice(0, MAX_MARKDOWN_CHARS)}\n\n[Content truncated for length.]`;
}

async function scrapeWithJina(targetUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

  try {
    const response = await fetch(`${JINA_READER_BASE}${targetUrl}`, {
      method: "GET",
      headers: {
        Accept: "text/markdown",
        "X-Return-Format": "markdown",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Jina Reader returned ${response.status} ${response.statusText}`.trim()
      );
    }

    const markdown = (await response.text()).trim();

    if (!markdown) {
      throw new Error("Jina Reader returned empty content.");
    }

    return markdown;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Scraping timed out. Try again with a simpler page.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const { active: isPaid } = session?.user?.id
    ? await getEntitlement(session.user.id)
    : { active: false };

  const cookieStore = await cookies();
  const usedFreeRoast = cookieStore.get(FREE_ROAST_COOKIE)?.value === "1";

  if (!isPaid && usedFreeRoast) {
    return NextResponse.json(
      { error: "You've used your free roast. Sign up for more at $1/mo." },
      { status: 402 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GROQ_API_KEY." },
      { status: 500 }
    );
  }

  let body: RoastRequestBody;

  try {
    body = (await request.json()) as RoastRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON with a url field." },
      { status: 400 }
    );
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!url || !isHttpUrl(url)) {
    return NextResponse.json(
      { error: "Provide a valid http or https website URL." },
      { status: 400 }
    );
  }

  let scrapedMarkdown: string;

  try {
    scrapedMarkdown = truncateMarkdown(await scrapeWithJina(url));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown scraping error.";
    return NextResponse.json(
      { error: `Scraping failed: ${message}` },
      { status: 502 }
    );
  }

  const userPrompt = [
    `Target URL: ${url}`,
    "",
    "--- scraped site markdown ---",
    scrapedMarkdown,
    "--- end scraped site markdown ---",
  ].join("\n");

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: userPrompt },
      ],
    });

    const roast = completion.choices[0]?.message?.content?.trim() ?? "";

    if (!roast) {
      return NextResponse.json(
        { error: "Groq returned an empty roast." },
        { status: 502 }
      );
    }

    const response = NextResponse.json({ roast });
    if (!isPaid) {
      response.cookies.set(FREE_ROAST_COOKIE, "1", {
        httpOnly: true,
        maxAge: FREE_ROAST_MAX_AGE_S,
        sameSite: "lax",
        path: "/",
      });
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Groq error.";
    return NextResponse.json(
      { error: `Groq request failed: ${message}` },
      { status: 500 }
    );
  }
}
