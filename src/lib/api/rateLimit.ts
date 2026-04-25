/**
 * Global rate limiter for API routes.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN are configured, with a
 * local in-memory fallback for dev/test environments.
 */

import { getRedis } from '@/lib/redis/client';

interface WindowEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, WindowEntry>();

/** Prune entries older than 2× the window to prevent unbounded memory growth */
function pruneStore(windowMs: number) {
  const cutoff = Date.now() - windowMs * 2;
  for (const [key, entry] of Array.from(store.entries())) {
    if (entry.windowStart < cutoff) store.delete(key);
  }
}

/**
 * Check and increment the rate limit for a given key.
 * @returns `{ allowed: boolean; remaining: number; resetAt: number }`
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedis();
  if (redis) {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `rl:${key}`;
    const member = `${now}:${Math.random().toString(36).slice(2)}`;

    await redis.zremrangebyscore(redisKey, 0, windowStart);
    await redis.zadd(redisKey, { score: now, member });
    await redis.expire(redisKey, Math.ceil(windowMs / 1000) * 2);

    const count = await redis.zcount(redisKey, windowStart, now);
    const remaining = Math.max(0, limit - count);
    return {
      allowed: count <= limit,
      remaining,
      resetAt: now + windowMs,
    };
  }

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    // Prune every ~100 requests to avoid memory leaks
    if (Math.random() < 0.01) pruneStore(windowMs);
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const resetAt = entry.windowStart + windowMs;

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt };
  }

  return { allowed: true, remaining, resetAt };
}

/**
 * Extract a rate-limit key from a request.
 * Uses the authenticated user ID if available, otherwise the client IP.
 */
export function getRateLimitKey(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `ip:${ip}`;
}

/**
 * Inngest report pipeline issues many internal LLM calls in one run with
 * `x-job-token` auth. Per-user throttling would 429 the pipeline after ~10 calls.
 * Only rate-limit real browser / API users.
 */
export function shouldRateLimitLlmForUser(auth: unknown): boolean {
  if (auth == null) return true;
  if (typeof auth === 'object' && auth !== null && 'job' in auth) {
    const j = (auth as { job?: unknown }).job;
    if (j) return false;
  }
  return true;
}

/**
 * Standard rate limit configs for different route tiers.
 */
export const RATE_LIMITS = {
  /** Commentary routes: expensive LLM calls — 10 requests per 60s per user */
  commentary: { limit: 10, windowMs: 60_000 },
  /** Ephemeris routes: Python service calls — 30 per 60s */
  ephemeris: { limit: 30, windowMs: 60_000 },
  /** Validation: 5 per 60s (each triggers multiple LLM calls) */
  validation: { limit: 5, windowMs: 60_000 },
} as const;
