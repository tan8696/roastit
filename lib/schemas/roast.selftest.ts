// Runnable check: `node lib/schemas/roast.selftest.ts`
import assert from "node:assert/strict";
import { RoastLlmSchema, RoastResultSchema, computeOverallScore } from "./roast.ts";

const validLlmResult = {
  categories: {
    headlineClarity: { score: 3, note: "Vague, could be any company." },
    ctaStrength: { score: 5, note: "Generic 'Learn More' button." },
    socialProof: { score: 2, note: "No logos, testimonials, or numbers." },
  },
  issues: [
    { severity: "critical" as const, category: "Value Prop", description: "The headline says nothing specific." },
    { severity: "moderate" as const, category: "Trust", description: "No social proof anywhere on the page." },
  ],
  rewrite: {
    headline: "Invoicing for freelancers, paid in 2 days instead of 30.",
    subheadline: "Stop chasing clients for payment.",
    cta: "Get Paid Faster",
  },
};

assert.equal(RoastLlmSchema.safeParse(validLlmResult).success, true, "valid LLM result should pass");

assert.equal(
  RoastLlmSchema.safeParse({ ...validLlmResult, categories: { ...validLlmResult.categories, ctaStrength: { score: 15, note: "x" } } }).success,
  false,
  "score out of 1-10 range should fail"
);

assert.equal(
  RoastLlmSchema.safeParse({ ...validLlmResult, issues: [{ severity: "catastrophic", category: "x", description: "x" }] }).success,
  false,
  "invalid severity enum value should fail"
);

assert.equal(RoastLlmSchema.safeParse({ ...validLlmResult, issues: [] }).success, false, "empty issues array should fail (min 1)");

console.log("✓ RoastLlmSchema validation checks passed");

// ─── Scoring math ───────────────────────────────────────────────────────────
const llmOnlyScore = computeOverallScore(validLlmResult.categories, null);
// avg(3,5,2)/10 * 100 = 33.33 -> 33
assert.equal(llmOnlyScore, 33, `LLM-only score should be 33, got ${llmOnlyScore}`);

const blendedScore = computeOverallScore(validLlmResult.categories, {
  performanceScore: 90,
  accessibilityScore: 80,
  seoScore: 100,
  largestContentfulPaintMs: 1200,
  cumulativeLayoutShift: 0.05,
});
// 90*0.35 + 80*0.1 + 100*0.15 + 33.33*0.4 = 31.5 + 8 + 15 + 13.33 = 67.83 -> 68
assert.equal(blendedScore, 68, `blended score should be 68, got ${blendedScore}`);
assert.ok(blendedScore > llmOnlyScore, "a page with good Lighthouse scores should score higher than LLM-only");

console.log("✓ computeOverallScore math checks passed");

// ─── Full result schema ─────────────────────────────────────────────────────
const fullResult = {
  ...validLlmResult,
  overallScore: blendedScore,
  deterministic: {
    performanceScore: 90,
    accessibilityScore: 80,
    seoScore: 100,
    largestContentfulPaintMs: 1200,
    cumulativeLayoutShift: 0.05,
  },
};
assert.equal(RoastResultSchema.safeParse(fullResult).success, true, "full assembled result should validate");
assert.equal(RoastResultSchema.safeParse({ ...fullResult, deterministic: null }).success, true, "null deterministic should validate (PageSpeed unavailable case)");

console.log("✓ RoastResultSchema checks passed");
console.log("All checks completed.");
