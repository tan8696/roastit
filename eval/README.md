# RoastIt eval set

A small hand-labeled benchmark: 28 real landing pages, your own honest 1-10
judgment on each, compared against what RoastIt's AI actually scores them.
This is what turns "I built an AI tool" into "I validated my AI tool's output
against a labeled benchmark" — a real answer to "how do you know it works."

`pages.json` deliberately mixes categories (SaaS, enterprise, nonprofit,
e-commerce, education, dev tools) and — as best I could judge from general
knowledge, not a live audit — a spread of expected quality, so the eval
actually tests whether the tool can tell a strong page from a weak one. I
did **not** put any quality hint in the file itself (only a neutral category
tag) — labeling it yourself, blind to any pre-judgment, is what makes your
label real ground truth instead of you just confirming a bias I planted.

Sanity-check each URL still resolves before you label it — sites change,
and I compiled this list without browsing each one live.

## How to label

For each entry in `pages.json`, replace `"humanLabel": null` with:

```json
"humanLabel": {
  "headlineClarity": 7,
  "ctaStrength": 5,
  "socialProof": 8,
  "topIssues": ["No pricing visible above the fold", "CTA button blends into the background"],
  "notes": "optional free-text, whatever you want to remember about this page"
}
```

Open each URL, spend a minute on it, score honestly using the rubric below.
`topIssues` and `notes` aren't auto-scored (see "What this doesn't measure"
below) — they're there so you have your own reasoning on record when you're
explaining a discrepancy in an interview.

Budget ~1-2 hours for all 28. You don't have to do them in one sitting —
partially-labeled files work fine, `run-eval.ts` only scores entries where
`humanLabel` isn't `null`.

## Scoring rubric

Score each category 1-10. These anchors match what the AI is instructed to
use, so your labels and its output are actually comparable.

**Headline Clarity** — could a stranger explain what this product does and
who it's for, from the headline alone?
- 1-3: Generic, could describe almost any company ("Innovative solutions for your business")
- 4-6: Somewhat specific, but vague on the actual outcome
- 7-10: Crystal clear — specific product, specific outcome, specific audience

**CTA Strength** — does the primary call-to-action reduce friction and make
the next step obvious?
- 1-3: Passive/generic ("Learn More", "Submit"), no urgency or clarity
- 4-6: Action-oriented but generic ("Get Started", "Sign Up")
- 7-10: Specific and benefit-driven, reduces perceived risk ("Start your free 14-day trial — no card required")

**Social Proof** — are there real, credible trust signals?
- 1-3: None visible (no logos, numbers, testimonials, reviews)
- 4-6: Present but generic/unverifiable ("Trusted by thousands")
- 7-10: Specific and credible (named customers, real numbers, third-party ratings, case studies)

## What this doesn't measure

`topIssues` is free text, not auto-compared — matching "the CTA is weak"
against a differently-worded AI issue reliably needs another LLM-as-judge
pass, which is a heavier, costlier thing to build than this eval set
warrants right now. `run-eval.ts` scores the three numeric categories only
(mean absolute error + correlation against your labels). Use `topIssues` for
your own manual spot-checking of whether the AI's actual critique makes
sense, not as an automated metric.

## Running the comparison

Once you've labeled at least a few pages:

```bash
node eval/run-eval.ts                              # against http://localhost:3000
BASE_URL=https://roastit.online node eval/run-eval.ts   # against production
```

This calls `/api/roast` for each labeled page (throttled to stay under the
existing rate limit — expect it to take a few minutes for the full set),
compares AI scores to your labels, and writes `eval/results.md` — a table
you can paste straight into the main README. Re-run it after any prompt or
model change to see whether accuracy actually improved.
