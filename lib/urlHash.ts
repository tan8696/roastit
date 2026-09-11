import crypto from "node:crypto";

// Same normalization + hash used for both the Redis roast cache key and the
// public /r/[slug] share link, so a given URL always maps to one identity
// regardless of which store is asking.
export function hashUrl(url: string): string {
  const normalized = url.trim().toLowerCase().replace(/\/+$/, "");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

// 12 hex chars (48 bits) is short enough to share comfortably and has a
// negligible collision chance at portfolio-project scale — by the birthday
// bound, ~2.4M unique URLs roasted before there's even a 1% chance of any
// collision at all.
export function shareSlugFor(url: string): string {
  return hashUrl(url).slice(0, 12);
}
