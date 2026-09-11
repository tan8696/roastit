// Compares RoastIt's AI scores against your hand-labeled ground truth.
// Usage: node eval/run-eval.ts
//        BASE_URL=https://roastit.online node eval/run-eval.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { meanAbsoluteError, pearsonCorrelation } from "./scoring.ts";
import { RoastResultSchema, type RoastResult } from "../lib/schemas/roast.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
// Roast is rate-limited to 5/min per IP; this script hits it from one IP, so
// space requests out to stay under that instead of tripping our own limiter.
const REQUEST_DELAY_MS = 13_000;

const CATEGORY_KEYS = ["headlineClarity", "ctaStrength", "socialProof"] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

type HumanLabel = {
  headlineClarity: number;
  ctaStrength: number;
  socialProof: number;
  topIssues: string[];
  notes?: string;
};
type PageEntry = { url: string; category: string; humanLabel: HumanLabel | null };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRoast(url: string): Promise<RoastResult> {
  const res = await fetch(`${BASE_URL}/api/roast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Request failed with status ${res.status}`);
  }
  const parsed = RoastResultSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Response didn't match RoastResultSchema: ${parsed.error.message}`);
  }
  return parsed.data;
}

async function main() {
  const pagesPath = path.join(__dirname, "pages.json");
  const pages: PageEntry[] = JSON.parse(fs.readFileSync(pagesPath, "utf-8"));
  const labeled = pages.filter((p): p is PageEntry & { humanLabel: HumanLabel } => p.humanLabel !== null);

  if (labeled.length === 0) {
    console.log("No labeled pages yet — fill in humanLabel entries in eval/pages.json first. See eval/README.md.");
    return;
  }

  console.log(`Running eval against ${BASE_URL} — ${labeled.length} labeled page(s), ~${Math.ceil((labeled.length * REQUEST_DELAY_MS) / 1000)}s.`);

  const perCategoryPairs: Record<CategoryKey, [number, number][]> = {
    headlineClarity: [],
    ctaStrength: [],
    socialProof: [],
  };
  const rows: string[] = [];
  const failures: string[] = [];

  for (let i = 0; i < labeled.length; i++) {
    const page = labeled[i];
    process.stdout.write(`[${i + 1}/${labeled.length}] ${page.url} ... `);
    try {
      const ai = await fetchRoast(page.url);
      for (const key of CATEGORY_KEYS) {
        perCategoryPairs[key].push([page.humanLabel[key], ai.categories[key].score]);
      }
      rows.push(
        `| ${page.url} | ${page.category} | ${page.humanLabel.headlineClarity} | ${ai.categories.headlineClarity.score} | ` +
          `${page.humanLabel.ctaStrength} | ${ai.categories.ctaStrength.score} | ${page.humanLabel.socialProof} | ${ai.categories.socialProof.score} |`
      );
      console.log("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${page.url}: ${message}`);
      console.log(`failed (${message})`);
    }
    if (i < labeled.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  const summaryLines = CATEGORY_KEYS.map((key) => {
    const pairs = perCategoryPairs[key];
    const mae = meanAbsoluteError(pairs);
    const corr = pearsonCorrelation(pairs);
    return `| ${key} | ${pairs.length} | ${mae.toFixed(2)} | ${Number.isNaN(corr) ? "n/a" : corr.toFixed(2)} |`;
  });

  const report = [
    "# RoastIt eval results",
    "",
    `Run against \`${BASE_URL}\` — ${rows.length} of ${labeled.length} labeled pages scored (${failures.length} failed).`,
    "",
    "## Summary (human vs AI, per category)",
    "",
    "| Category | Pages | Mean Absolute Error (1-10 scale) | Correlation |",
    "|---|---|---|---|",
    ...summaryLines,
    "",
    "## Per-page scores",
    "",
    "| URL | Category | Headline (human/AI) | | CTA (human/AI) | | Social Proof (human/AI) | |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
    ...(failures.length
      ? ["", "## Failures", "", ...failures.map((f) => `- ${f}`)]
      : []),
  ].join("\n");

  const resultsPath = path.join(__dirname, "results.md");
  fs.writeFileSync(resultsPath, report + "\n");
  console.log(`\nWrote ${resultsPath}`);
  console.log("\n" + summaryLines.join("\n"));
}

main();
