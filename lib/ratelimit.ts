// lib/ratelimit.ts
// Tiny in-memory sliding-window rate limiter.
//
// NOTE: this is per-process — it resets on restart and is NOT shared across
// serverless instances. It's a light guard against rapid abuse from one user,
// not a hard guarantee. For real production use a shared store (e.g. Upstash
// Redis). Good enough to keep a single user from hammering the API.

const hits = new Map<string, number[]>();

// Returns true if the call is ALLOWED, false if it should be blocked.
export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}