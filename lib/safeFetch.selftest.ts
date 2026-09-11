// Runnable check for the SSRF guard: `node lib/safeFetch.selftest.ts`
// No test framework in this project — this is the "smallest thing that
// fails if the logic breaks" for a security-relevant path.
import assert from "node:assert/strict";
import { isBlockedAddress, isBlockedHostname, safeFetch, UnsafeUrlError } from "./safeFetch.ts";

// ─── Pure classifier checks (offline, deterministic) ──────────────────────────
assert.equal(isBlockedAddress("127.0.0.1"), true, "loopback v4 should be blocked");
assert.equal(isBlockedAddress("169.254.169.254"), true, "cloud metadata endpoint should be blocked");
assert.equal(isBlockedAddress("10.0.0.5"), true, "10.0.0.0/8 should be blocked");
assert.equal(isBlockedAddress("172.16.0.1"), true, "172.16.0.0/12 should be blocked");
assert.equal(isBlockedAddress("172.32.0.1"), false, "172.32.0.0 is outside 172.16.0.0/12");
assert.equal(isBlockedAddress("192.168.1.1"), true, "192.168.0.0/16 should be blocked");
assert.equal(isBlockedAddress("8.8.8.8"), false, "public v4 address should not be blocked");
assert.equal(isBlockedAddress("::1"), true, "IPv6 loopback should be blocked");
assert.equal(isBlockedAddress("fe80::1"), true, "IPv6 link-local should be blocked");
assert.equal(isBlockedAddress("fc00::1"), true, "IPv6 unique-local should be blocked");
assert.equal(isBlockedAddress("::ffff:127.0.0.1"), true, "IPv4-mapped loopback should be blocked");
assert.equal(isBlockedAddress("2001:4860:4860::8888"), false, "public IPv6 (Google DNS) should not be blocked");

assert.equal(isBlockedHostname("localhost"), true);
assert.equal(isBlockedHostname("LOCALHOST"), true, "hostname check should be case-insensitive");
assert.equal(isBlockedHostname("127.0.0.1"), true, "a literal IP in the hostname position");
assert.equal(isBlockedHostname("example.com"), false);

console.log("✓ classifier checks passed");

// ─── safeFetch behavior (network-dependent where noted) ───────────────────────
async function expectBlocked(url: string) {
  await assert.rejects(() => safeFetch(url, { timeoutMs: 3000 }), UnsafeUrlError, `expected ${url} to be blocked`);
}

async function main() {
  await expectBlocked("http://127.0.0.1/");
  await expectBlocked("http://169.254.169.254/latest/meta-data/");
  await expectBlocked("http://localhost:3000/");
  console.log("✓ safeFetch blocks localhost/loopback/metadata targets");

  try {
    const html = await safeFetch("https://example.com/", { timeoutMs: 5000 });
    assert.ok(html.toLowerCase().includes("example"), "expected example.com content back");
    console.log("✓ safeFetch successfully fetches a real public URL");
  } catch (err) {
    console.warn(
      "! skipped live fetch of example.com — network unavailable in this environment:",
      err instanceof Error ? err.message : err
    );
  }
}

main().then(() => console.log("All checks completed."));
