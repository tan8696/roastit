import { PageSpeedMetricsSchema, type PageSpeedMetrics } from "@/lib/schemas/roast";

// Lighthouse audits genuinely take 10-20s to run server-side on Google's end —
// this is the slow part of a roast, run in parallel with the Groq call rather
// than after it.
const PAGESPEED_TIMEOUT_MS = 25_000;

// Optional infra: returns null (never throws) when PAGESPEED_API_KEY isn't
// configured, on any request failure, or if the response doesn't have usable
// category scores (e.g. the target page failed to load for Lighthouse) — the
// roast still works with LLM-only analysis, just without cited real numbers.
export async function getPageSpeedMetrics(url: string): Promise<PageSpeedMetrics | null> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) return null;

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("strategy", "mobile");
  for (const category of ["performance", "accessibility", "seo"]) {
    endpoint.searchParams.append("category", category);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAGESPEED_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint.toString(), { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json();
    const categories = data?.lighthouseResult?.categories;
    const audits = data?.lighthouseResult?.audits;

    const toScore = (v: unknown): number | null => (typeof v === "number" ? Math.round(v * 100) : null);
    const performanceScore = toScore(categories?.performance?.score);
    const accessibilityScore = toScore(categories?.accessibility?.score);
    const seoScore = toScore(categories?.seo?.score);

    if (performanceScore === null || accessibilityScore === null || seoScore === null) {
      return null;
    }

    const parsed = PageSpeedMetricsSchema.safeParse({
      performanceScore,
      accessibilityScore,
      seoScore,
      largestContentfulPaintMs: audits?.["largest-contentful-paint"]?.numericValue ?? null,
      cumulativeLayoutShift: audits?.["cumulative-layout-shift"]?.numericValue ?? null,
    });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
