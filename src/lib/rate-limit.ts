/**
 * In-process token-bucket rate limiter.
 *
 * In a multi-pod deploy this only protects each instance independently; a
 * shared Redis-backed limiter (e.g. @upstash/ratelimit) is recommended for
 * production. The interface here is deliberately compatible with that swap.
 */

interface Bucket {
  tokens: number;
  lastRefill: number; // ms epoch
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Identifier (e.g. IP, IP+route, IP+email). */
  key: string;
  /** Maximum tokens (events) per window. */
  max: number;
  /** Window length in ms. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number; // ms until window refills
}

/**
 * Sliding-window approximation. Each key gets `max` tokens, refilled uniformly
 * across `windowMs`. Returns whether the call is allowed and remaining quota.
 */
export function rateLimit({ key, max, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const refillRate = max / windowMs; // tokens per ms
  const existing = buckets.get(key);

  let tokens: number;
  if (!existing) {
    tokens = max - 1;
    buckets.set(key, { tokens, lastRefill: now });
    return { allowed: true, remaining: tokens, resetMs: windowMs };
  }

  // Refill based on elapsed time.
  const elapsed = now - existing.lastRefill;
  const refilled = Math.min(max, existing.tokens + elapsed * refillRate);
  if (refilled < 1) {
    const deficit = 1 - refilled;
    const resetMs = Math.ceil(deficit / refillRate);
    buckets.set(key, { tokens: refilled, lastRefill: now });
    return { allowed: false, remaining: 0, resetMs };
  }
  tokens = refilled - 1;
  buckets.set(key, { tokens, lastRefill: now });
  return { allowed: true, remaining: Math.floor(tokens), resetMs: windowMs };
}

/** Extract the best-available client IP from request headers. */
export function clientIp(headers: Headers, fallback: string = "unknown"): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") || fallback;
}

/**
 * Per-instance cap on stored buckets. Older entries are dropped on insert.
 * Prevents a long-running process from leaking memory if keys are unique.
 */
const MAX_BUCKETS = 10_000;
function gcIfNeeded() {
  if (buckets.size > MAX_BUCKETS) {
    // Drop the first 1% of entries (Map iteration is insertion order).
    const drop = Math.floor(MAX_BUCKETS * 0.01);
    let i = 0;
    for (const k of buckets.keys()) {
      buckets.delete(k);
      if (++i >= drop) break;
    }
  }
}
