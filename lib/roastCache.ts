import crypto from "node:crypto";
import { getRedis } from "@/lib/redis";

const ROAST_CACHE_TTL_S = 60 * 60 * 24; // 24h — long enough to dedupe repeat traffic on a popular URL

function cacheKeyFor(url: string): string {
  const normalized = url.trim().toLowerCase().replace(/\/+$/, "");
  const hash = crypto.createHash("sha256").update(normalized).digest("hex");
  return `roast:${hash}`;
}

export async function getCachedRoast(url: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const cached = await redis.get<string>(cacheKeyFor(url));
  return cached ?? null;
}

export async function setCachedRoast(url: string, roast: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(cacheKeyFor(url), roast, { ex: ROAST_CACHE_TTL_S });
}
