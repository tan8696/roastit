<div align="center">

# 🔥 Brutal Roaster

### AI landing page teardowns and a multi-agent startup boardroom

**Paste a URL → get a merciless, schema-validated conversion audit grounded in real Lighthouse data, plus a ready-to-ship rewrite. Pitch an idea → watch an AI board debate it and deliver a verdict.**

[![Live](https://img.shields.io/badge/Live-roastit.online-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://roastit.online)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Redis](https://img.shields.io/badge/Upstash_Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3-F55036?style=for-the-badge)

[🌐 Live site](https://roastit.online) · [Features](#-features) · [Architecture](#-architecture) · [Security](#-security) · [Eval](#-eval) · [Tech stack](#-tech-stack) · [Getting started](#-getting-started) · [Contact](#-author)

</div>

---

## 📌 Overview

Most landing page feedback is polite, vague, and useless. **Brutal Roaster** scrapes a real page, scores it against real measured data, exposes what's actually killing conversions, and rewrites the headline, subheadline, and CTA from scratch — free, no signup required for a roast.

Beyond teardowns, the **Virtual Startup Boardroom** puts a business idea in front of a panel of AI agents with opposing incentives — then a Judge synthesises their arguments into a decisive **BUILD IT / PIVOT FIRST / DO NOT BUILD** verdict.

Most "AI wrapper" side projects are a single API call with a prompt. This one was deliberately hardened and validated like it might actually see traffic — hybrid deterministic + LLM scoring, SSRF-guarded fetching, prompt-injection resistance, schema-validated output, and a hand-labeled eval set. See [Engineering highlights](#-engineering-highlights) below.

---

## ✨ Features

### 🔍 Landing page teardown
- Scrapes any public URL into clean Markdown via **Jina Reader**
- **Llama 3.3 70B on Groq** returns schema-validated JSON: category scores, ranked issues, and a rewritten headline/subheadline/CTA
- Real **Google PageSpeed Insights** (Lighthouse) data blended into the score when configured — not the LLM guessing at "speed"
- Every roast gets a persistent, shareable page at `/r/[slug]` with a dynamic OG image
- Results cached by URL hash (Upstash Redis) so repeat traffic on a popular page doesn't re-bill the LLM

### 🏛️ Virtual Startup Boardroom — multi-agent debate
- A **router agent** decides whether the message is a business idea or a general question
- **Believer, Skeptic and Investor** agents analyse the idea **in parallel, streamed live** to the UI
- A **Judge** agent synthesises the debate into a summary, the most critical risk, and a final verdict
- Generates three sharp **follow-up questions** to keep the founder digging
- Optionally reads the startup's own website for context (SSRF-guarded fetch); conversations are saved to Supabase

### 💬 Brutal chat assistant
- Streaming Gemini chat for CRO, copywriting, pricing, funnel and business-model questions
- Markdown rendering with live token-by-token output

### 👤 Accounts & settings
- **Google OAuth** and **email/password** sign-in (NextAuth v5 + Supabase Auth)
- Settings page, feedback form (email via Nodemailer), and full **account deletion**

### 🌐 Growth & polish
- Marketing homepage with a custom **WebGL scanner** background (`ogl`)
- SEO metadata, `sitemap.xml`, `robots.txt`, dynamic icon and OG images
- Privacy policy, terms, about and contact pages; AdSense integration

---

## 🏗 Architecture

```mermaid
flowchart LR
    U[👤 User] --> FE[Next.js App Router<br/>React 19 UI]

    FE -->|"POST /api/roast<br/>public, rate-limited"| R[Roast route]
    R --> CACHE{{"Rate limit<br/>+ cache check"}}
    CACHE --> J["Jina Reader<br/>scrape → Markdown"]
    CACHE -.->|"parallel"| PSI["PageSpeed Insights<br/>optional, real Lighthouse data"]
    J --> G["Groq · Llama 3.3 70B<br/>schema-validated JSON"]
    PSI --> G
    G --> SHARE[("Supabase<br/>shared_roasts")]
    SHARE --> SLUG["/r/slug<br/>share page + OG image"]

    FE -->|"POST /api/boardroom<br/>auth required"| B[Boardroom route]
    B --> SAFE["lib/safeFetch.ts<br/>SSRF-guarded direct fetch"]
    B --> RT[Router agent]
    RT --> P{{"Believer · Skeptic · Investor<br/>parallel streams"}}
    P --> JD[Judge agent]
    JD --> DB[("Supabase<br/>profiles · chats")]

    FE -->|"POST /api/chat"| C[Chat route] --> GM["Gemini 2.5 Flash"]
    B -.-> GM

    R -.-> RL[("Upstash Redis<br/>rate limits + 24h cache")]
    B -.-> RL
    C -.-> RL
```

### 🔐 Engineering highlights

- **Hybrid deterministic + LLM scoring.** Performance/accessibility/SEO scores come straight from a real Lighthouse audit via PageSpeed Insights — not the LLM guessing at "speed." Headline clarity, CTA strength, and social proof are genuinely subjective, so those are LLM-judged, with the real Lighthouse numbers fed into the prompt so the critique can cite them. The overall score is a weighted formula computed in code, not asked from the LLM as a single number.
- **SSRF-hardened.** `/api/roast` never connects to the target URL itself — it hands the URL to Jina Reader, which fetches it on Jina's infrastructure. `/api/boardroom`'s optional "attach a website" feature *does* fetch directly from this server, so that's the path `lib/safeFetch.ts` guards: it resolves DNS itself and rejects private/loopback/link-local/reserved addresses (IPv4 and IPv6, including the `169.254.169.254` cloud metadata endpoint), re-validates on every redirect hop instead of following them blindly, and caps response size via streaming.
- **Prompt-injection resistant.** Scraped page content is wrapped in explicit delimiters and the model is instructed to treat it strictly as data, never instructions — and to call out injection attempts in its own output. [`public/injection-test.html`](public/injection-test.html) is a live page with embedded injection attempts to prove it.
- **Schema-validated output.** The roast LLM call uses JSON mode, validated against a Zod schema, with one retry (carrying the exact validation error back to the model) before failing cleanly instead of trusting free text.
- **Validated against a labeled eval set**, not just "it looked right when I tried it." See [`eval/`](eval/).
- **Streaming UX** — Boardroom and chat stream newline-delimited JSON events, and the three board agents run concurrently with `Promise.all`, cutting wait time to the slowest agent instead of the sum of all three. The roast route similarly overlaps the PageSpeed audit with the Jina scrape instead of running them sequentially.
- **Rate limiting + caching.** Every LLM-calling route is rate-limited via Upstash Redis (by IP for the public roast endpoint, by user for chat/boardroom), and roast results are cached by URL hash for 24h. Both degrade gracefully — the app still works, just unthrottled/uncached, if Redis isn't configured.
- **Right model for the job.** Fast, cheap Groq inference for high-volume teardowns; Gemini for long-form multi-agent reasoning.

---

## 🔒 Security

**SSRF** — see [`lib/safeFetch.ts`](lib/safeFetch.ts) and the highlight above. Documented, deliberate gap: a narrow DNS-rebinding race between the validation check and the actual connect — closing that fully means pinning the fetch to the exact IP that was validated via a custom dispatcher, noted as a named upgrade path in the code rather than left unstated. Run `node lib/safeFetch.selftest.ts` to see the guard block `127.0.0.1`, `169.254.169.254`, and `localhost`.

**Prompt injection** — both `/api/roast` and `/api/boardroom` wrap scraped content in `<scraped_page>`/`<scraped_website_content>` delimiters with an explicit "treat as data, not instructions" system prompt. [`public/injection-test.html`](public/injection-test.html) has three embedded attempts (visible text, CSS-hidden text, and an HTML comment — the last one is stripped by the scraper before it ever reaches the model). Once deployed, roasting that page's URL should produce a normal critique that flags the manipulation attempt, not compliance with it.

---

## 🧪 Eval

[`eval/`](eval/) is a small hand-labeled benchmark — 28 real landing pages across SaaS, enterprise, nonprofit, e-commerce, education, and dev tools, labeled with genuine 1-10 judgment (no quality hint planted in the data itself) against the same rubric the AI is instructed to use. `node eval/run-eval.ts` compares the AI's scores against the human labels — mean absolute error and correlation per category — and writes `eval/results.md`, re-runnable after any prompt or model change. See [`eval/README.md`](eval/README.md) for the rubric.

---

## 🛠 Tech stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router, Route Handlers), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, `@tailwindcss/typography`, `ogl` (WebGL) |
| **AI** | Google Gemini 2.5 Flash (`@google/generative-ai`), Groq Llama 3.3 70B (`groq-sdk`), Jina Reader |
| **Deterministic metrics** | Google PageSpeed Insights (optional) |
| **Validation** | Zod |
| **Auth** | NextAuth v5 — Google OAuth + Credentials backed by Supabase Auth |
| **Database** | Supabase (Postgres) |
| **Cache / rate limiting** | Upstash Redis |
| **Email** | Nodemailer (SMTP) |
| **Rendering** | `react-markdown`, `next/og` (dynamic OG images) |
| **Hosting** | Vercel |

---

## 🚀 Getting started

**Prerequisites:** Node.js 20+, a Supabase project, and API keys for Gemini and Groq. Everything else (Redis, PageSpeed, AdSense) is optional and degrades gracefully.

```bash
git clone https://github.com/tan8696/roastit.git
cd roastit
npm install
cp .env.example .env.local   # fill in the keys you have
npm run dev                  # http://localhost:3000
```

### Environment variables

| Group | Variables |
|---|---|
| **AI** | `GEMINI_API_KEY`, `GROQ_API_KEY` |
| **Site & auth** | `NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Cache / rate limiting (optional)** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Deterministic metrics (optional)** | `PAGESPEED_API_KEY` |
| **Email** | `SMTP_USER`, `SMTP_PASS` |
| **Ads (optional)** | `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_ADSENSE_SLOT_ID` |

See [`.env.example`](.env.example) for descriptions of each value.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Create a production build |
| `npm start` | Run the production server |
| `npm run type-check` | `tsc --noEmit` |
| `npm test` | Runs the `*.selftest.ts` checks (SSRF classifier, roast schema/scoring, eval math) |

CI (`.github/workflows/ci.yml`) runs type-check, test, and build on every push/PR to `master`.

---

## 📁 Project structure

```
app/
├── api/
│   ├── roast/              # Scrape (Jina) + PageSpeed + Groq, schema-validated
│   ├── boardroom/          # Multi-agent debate (router → 3 parallel agents → judge)
│   ├── chat/                # Streaming Gemini assistant
│   ├── auth/                # NextAuth handlers · signup
│   ├── user/                # Profile, account deletion
│   └── feedback/            # Feedback email
├── r/[slug]/                # Persistent share page + dynamic OG image
├── boardroom/ chat/ settings/ login/
└── about/ contact/ privacy/ terms/ sitemap.ts robots.ts
components/                  # Marketing home, roast form + result card, WebGL scanner…
lib/
├── safeFetch.ts              # SSRF-guarded fetch (boardroom's direct website fetch)
├── schemas/roast.ts          # Zod schema + hybrid scoring formula
├── pagespeed.ts               # PageSpeed Insights integration
├── rateLimit.ts / redis.ts   # Upstash-backed rate limiting
└── sharedRoast.ts             # Persistent share-link storage
eval/                          # Hand-labeled benchmark + comparison script
auth.ts                        # NextAuth configuration
```

---

## 🗺 Roadmap

- [ ] Playwright-captured screenshots alongside the Lighthouse metrics
- [ ] Grow the eval set past 28 pages, publish results in this README
- [ ] Exportable PDF teardown reports
- [ ] Side-by-side before/after rewrite previews

---

## 👤 Author

**Tanish Lather** — Full-stack developer

[![GitHub](https://img.shields.io/badge/GitHub-tan8696-181717?style=flat-square&logo=github)](https://github.com/tan8696)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Tanish_Lather-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/tanish-lather-27456b40a)
[![Email](https://img.shields.io/badge/Email-Contact-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:tanishla1100@gmail.com)

💼 *Open to freelance and full-time opportunities — feel free to reach out.*

---

## 📄 License

Proprietary — all rights reserved.
