import crypto from "node:crypto";
import { getRedis } from "@/lib/redis";
import { RoastResultSchema, type RoastResult } from "@/lib/schemas/roast";

const ROAST_CACHE_TTL_S = 60 * 60 * 24; // 24h — long enough to dedupe repeat traffic on a popular URL

function cacheKeyFor(url: string): string {
  const normalized = url.trim().toLowerCase().replace(/\/+$/, "");
  const hash = crypto.createHash("sha256").update(normalized).digest("hex");
  return `roast:${hash}`;
}

// Re-validates against the current schema on read — a cache entry written by
// a previous version of this schema (or corrupted data) is treated as a miss
// rather than crashing the caller with an unexpected shape.
export async function getCachedRoast(url: string): Promise<RoastResult | null> {
  const redis = getRedis();
  if (!redis) return null;
  const cached = await redis.get(cacheKeyFor(url));
  if (!cached) return null;
  const parsed = RoastResultSchema.safeParse(cached);
  return parsed.success ? parsed.data : null;
}

export async function setCachedRoast(url: string, result: RoastResult): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(cacheKeyFor(url), result, { ex: ROAST_CACHE_TTL_S });
}
