import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";

// ponytail: fails OPEN (allows the request) when Redis isn't configured —
// this is an abuse-prevention layer, not a security boundary, and a missing
// env var shouldn't take the whole app down. Once Upstash is wired up in
// production this actually enforces the limit; until then, requests just
// aren't rate-limited (same "degrade gracefully" pattern already used for
// optional Supabase/GROQ_API_KEY config elsewhere in this codebase).
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowSeconds: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${limit}:${windowSeconds}`;
  const cached = limiters.get(cacheKey);
  if (cached) return cached;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: "ratelimit",
  });
  limiters.set(cacheKey, limiter);
  return limiter;
}

export async function checkRateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number }
): Promise<{ success: boolean }> {
  const limiter = getLimiter(limit, windowSeconds);
  if (!limiter) return { success: true };

  const { success } = await limiter.limit(key);
  return { success };
}

// Vercel sets x-forwarded-for on every request; falls back to "unknown" for
// local dev / anything running behind a proxy that doesn't set it (in which
// case every unidentified caller shares one bucket — acceptable for a
// best-effort abuse guard, not for anything security-critical).
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}
