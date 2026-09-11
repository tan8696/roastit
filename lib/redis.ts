import { Redis } from "@upstash/redis";

// Optional infra: most routes should degrade gracefully (skip caching / skip
// rate limiting) rather than break when Upstash isn't configured, matching
// how this codebase already treats Supabase/GROQ_API_KEY as optional-until-set.
let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}
