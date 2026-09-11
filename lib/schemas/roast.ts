import { z } from "zod";

// ─── What we ask Groq to return ────────────────────────────────────────────────
// These three categories are genuinely subjective — no Lighthouse audit can
// measure "is this headline clear." Speed/accessibility/SEO are NOT asked of
// the LLM; those come from real PageSpeed Insights data (see lib/pagespeed.ts)
// so the roast can cite actual numbers instead of an LLM guessing them.
const CategoryScoreSchema = z.object({
  score: z.number().min(1).max(10),
  note: z.string().min(1).max(400),
});

export const RoastLlmSchema = z.object({
  categories: z.object({
    headlineClarity: CategoryScoreSchema,
    ctaStrength: CategoryScoreSchema,
    socialProof: CategoryScoreSchema,
  }),
  issues: z
    .array(
      z.object({
        severity: z.enum(["critical", "moderate", "minor"]),
        category: z.string().min(1).max(60),
        description: z.string().min(1).max(400),
      })
    )
    .min(1)
    .max(12),
  rewrite: z.object({
    headline: z.string().min(1).max(200),
    subheadline: z.string().min(1).max(300),
    cta: z.string().min(1).max(60),
  }),
});
export type RoastLlmResult = z.infer<typeof RoastLlmSchema>;

// ─── Deterministic metrics from PageSpeed Insights ─────────────────────────────
export const PageSpeedMetricsSchema = z.object({
  performanceScore: z.number().min(0).max(100),
  accessibilityScore: z.number().min(0).max(100),
  seoScore: z.number().min(0).max(100),
  largestContentfulPaintMs: z.number().nullable(),
  cumulativeLayoutShift: z.number().nullable(),
});
export type PageSpeedMetrics = z.infer<typeof PageSpeedMetricsSchema>;

// ─── The final API response ────────────────────────────────────────────────────
export const RoastResultSchema = RoastLlmSchema.extend({
  overallScore: z.number().min(0).max(100),
  deterministic: PageSpeedMetricsSchema.nullable(),
  cached: z.boolean().optional(),
  shareSlug: z.string().optional(),
});
export type RoastResult = z.infer<typeof RoastResultSchema>;

// Weighted blend, computed in code rather than asked of the LLM — a single
// "overall score" from an LLM is exactly the kind of number it's prone to
// making up inconsistently between requests. When PageSpeed data is missing
// (no API key configured), the LLM categories are reweighted to fill the gap
// rather than silently zeroing out 70% of the score.
export function computeOverallScore(
  categories: RoastLlmResult["categories"],
  deterministic: PageSpeedMetrics | null
): number {
  const llmAvgPct =
    ((categories.headlineClarity.score + categories.ctaStrength.score + categories.socialProof.score) / 3 / 10) * 100;

  if (!deterministic) return Math.round(llmAvgPct);

  const weighted =
    deterministic.performanceScore * 0.35 +
    deterministic.accessibilityScore * 0.1 +
    deterministic.seoScore * 0.15 +
    llmAvgPct * 0.4;

  return Math.round(weighted);
}
