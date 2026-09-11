import { promises as dns } from "node:dns";
import net from "node:net";

// ─── IP range classification ──────────────────────────────────────────────────
// No IP-range library is installed and none of the existing deps cover this,
// so these are hand-rolled but self-contained (no network calls, pure math).

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const inRange = (base: string, bits: number) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  };
  return (
    inRange("0.0.0.0", 8) || // "this" network
    inRange("10.0.0.0", 8) ||
    inRange("100.64.0.0", 10) || // carrier-grade NAT
    inRange("127.0.0.0", 8) || // loopback
    inRange("169.254.0.0", 16) || // link-local — covers the 169.254.169.254 cloud metadata endpoint
    inRange("172.16.0.0", 12) ||
    inRange("192.0.0.0", 24) || // IETF protocol assignments
    inRange("192.168.0.0", 16) ||
    inRange("198.18.0.0", 15) || // benchmarking
    inRange("224.0.0.0", 4) || // multicast
    inRange("240.0.0.0", 4) // reserved
  );
}

function ipv6ToBigInt(ip: string): bigint {
  // IPv4-mapped (::ffff:a.b.c.d) — fold the trailing IPv4 into two hex groups first.
  const v4Match = ip.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Match) {
    const v4n = ipv4ToInt(v4Match[2]);
    const hi = (v4n >>> 16).toString(16);
    const lo = (v4n & 0xffff).toString(16);
    ip = `${v4Match[1]}${hi}:${lo}`;
  }

  let groups: string[];
  if (ip.includes("::")) {
    const [left, right] = ip.split("::");
    const leftParts = left ? left.split(":") : [];
    const rightParts = right ? right.split(":") : [];
    const missing = 8 - leftParts.length - rightParts.length;
    groups = [...leftParts, ...Array(Math.max(missing, 0)).fill("0"), ...rightParts];
  } else {
    groups = ip.split(":");
  }

  return groups.reduce((acc, part) => (acc << 16n) + BigInt(parseInt(part || "0", 16)), 0n);
}

function isPrivateIPv6(ip: string): boolean {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isPrivateIPv4(mapped[1]);

  const n = ipv6ToBigInt(ip);
  const inRange = (baseHighBits: bigint, prefixLen: number) => {
    const mask = prefixLen === 0 ? 0n : (~0n << BigInt(128 - prefixLen)) & ((1n << 128n) - 1n);
    return (n & mask) === (baseHighBits & mask);
  };

  const loopback = n === 1n;
  const unspecified = n === 0n;
  const uniqueLocal = inRange(0xfcn << 120n, 7); // fc00::/7
  const linkLocal = inRange(0xfe80n << 112n, 10); // fe80::/10
  const multicast = inRange(0xffn << 120n, 8); // ff00::/8
  return loopback || unspecified || uniqueLocal || linkLocal || multicast;
}

export function isBlockedAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unrecognizable — fail closed
}

export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (net.isIP(h)) return isBlockedAddress(h);
  return false;
}

// ponytail: DNS is resolved and validated here, then a normal `fetch(url)`
// is issued against the hostname (not the resolved IP) a moment later —
// a second internal DNS lookup happens at connect time. A malicious DNS
// server could theoretically answer differently between these two lookups
// (DNS rebinding) and slip a private IP past this check. Closing that
// requires pinning the fetch to the exact IP we validated (a custom undici
// Agent/dispatcher with a fixed `lookup`), which is real added complexity
// for a narrow race window. Upgrade path: pin via a custom dispatcher if
// this ever handles untrusted traffic at real scale.
async function resolveAllSafe(hostname: string): Promise<boolean> {
  if (isBlockedHostname(hostname)) return false;
  let records: { address: string }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return false;
  }
  if (records.length === 0) return false;
  return records.every((r) => !isBlockedAddress(r.address));
}

export class UnsafeUrlError extends Error {}

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 3_000_000;
const DEFAULT_MAX_REDIRECTS = 3;

// Fetches a user-supplied URL while defending against SSRF: validates the
// URL scheme, resolves DNS and rejects private/loopback/link-local/reserved
// addresses (catching cloud metadata endpoints like 169.254.169.254), and
// re-validates on every redirect hop instead of letting fetch follow them
// blindly — otherwise an attacker's own server could 302 to an internal
// address and slip past a check done only on the original URL. Also caps
// response size via streaming instead of buffering an unbounded body.
export async function safeFetch(
  initialUrl: string,
  opts: {
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  let currentUrl = initialUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new UnsafeUrlError("Only http/https URLs are allowed.");
    }

    const safe = await resolveAllSafe(parsed.hostname);
    if (!safe) {
      throw new UnsafeUrlError(
        `Refusing to fetch "${parsed.hostname}": resolves to a private, loopback, or reserved address.`
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: opts.headers,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new UnsafeUrlError("Redirect response had no Location header.");
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }

    if (!res.body) {
      return await res.text();
    }

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
  }

  throw new UnsafeUrlError("Too many redirects.");
}
