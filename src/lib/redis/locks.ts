import { getRedis } from './client';

const localLocks = new Map<string, number>();

// The in-memory fallback below is DEV-ONLY: on Vercel each request can run in a
// separate serverless instance, so this Map gives ZERO cross-instance mutual
// exclusion. In production the duplicate-generation guard relies on Upstash Redis
// (and, for the Inngest path, the function-level concurrency key). Warn loudly,
// once, if we ever fall back to the in-memory map in production so a missing
// UPSTASH_REDIS_REST_URL/TOKEN is caught instead of silently degrading.
let warnedNoRedisInProd = false;
function warnIfNoRedisInProd() {
  if (warnedNoRedisInProd) return;
  if (process.env.NODE_ENV === 'production') {
    warnedNoRedisInProd = true;
    console.error(
      '[locks] Upstash Redis is NOT configured in production — distributed locks ' +
        'are degraded to a per-instance in-memory map with no cross-instance ' +
        'exclusion. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.',
    );
  }
}

function pruneLocalLocks() {
  const now = Date.now();
  for (const [key, expiresAt] of Array.from(localLocks.entries())) {
    if (expiresAt <= now) localLocks.delete(key);
  }
}

export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const result = await redis.set(`lock:${key}`, '1', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  }

  warnIfNoRedisInProd();
  pruneLocalLocks();
  if (localLocks.has(key)) return false;
  localLocks.set(key, Date.now() + ttlSeconds * 1000);
  return true;
}

export async function releaseLock(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(`lock:${key}`);
    return;
  }
  localLocks.delete(key);
}
