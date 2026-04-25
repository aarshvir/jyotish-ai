import { createHash } from 'crypto';
import { getRedis } from './client';

const localCache = new Map<string, { value: unknown; expiresAt: number }>();

export function stableCacheKey(prefix: string, value: unknown): string {
  const hash = createHash('sha256').update(JSON.stringify(value)).digest('hex');
  return `${prefix}:${hash}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    return await redis.get<T>(key);
  }

  const entry = localCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    localCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, value, { ex: ttlSeconds });
    return;
  }

  if (localCache.size >= 512) {
    const firstKey = localCache.keys().next().value;
    if (firstKey) localCache.delete(firstKey);
  }
  localCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
