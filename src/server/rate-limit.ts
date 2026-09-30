import "server-only";

/**
 * Minimal fixed-window rate limiter kept in memory.
 *
 * Good enough to slow down password guessing on a single instance. On
 * serverless each instance has its own memory, so a production deployment at
 * scale would move this to a shared store (e.g. Redis/Upstash).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Clear a key, e.g. after a successful login so only failed attempts count. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}
