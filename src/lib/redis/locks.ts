import { getRedis } from './client';

const localLocks = new Map<string, number>();

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
