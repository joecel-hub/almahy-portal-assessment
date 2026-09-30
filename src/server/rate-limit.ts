import "server-only";

/**
 * Minimal fixed-window limiter for failed login attempts, kept in memory.
 *
 * Only *failures* are recorded, so server errors or a successful sign-in never
 * lock a user out. Good enough to slow down password guessing on one
 * instance; at scale this moves to a shared store (e.g. Redis/Upstash) so all
 * serverless instances see the same counts.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Seconds until the key may try again, or 0 if it is not limited. */
export function retryAfter(key: string, limit: number): number {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= Date.now() || bucket.count < limit) return 0;
  return Math.ceil((bucket.resetAt - Date.now()) / 1000);
}

export function recordFailure(key: string, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else bucket.count += 1;
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
