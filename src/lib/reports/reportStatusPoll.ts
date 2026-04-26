/** Short TTL: collapse ultra-frequent client polls into one primary read per instance. */
export const REPORT_STATUS_CACHE_TTL_MS = 1_500;

const RATE_LIMIT_WINDOW_MS = 10_000;
/** Per-user cap across all report status polls (burst-tolerant sliding window). */
const RATE_LIMIT_MAX_REQUESTS = 40;

const MAX_CACHE_ENTRIES = 8_000;
const MAX_RATE_TRACKED_USERS = 20_000;

/** Payload without volatile poll hints (stored in memory cache). */
export type ReportStatusCachePayload = Record<string, unknown>;

type CacheEntry = {
  expiresAt: number;
  payload: ReportStatusCachePayload;
};

const statusCache = new Map<string, CacheEntry>();
const inflightReads = new Map<string, Promise<unknown>>();
const userRequestTimestamps = new Map<string, number[]>();

function cacheKey(reportId: string, userId: string): string {
  return `${reportId}\0${userId}`;
}

function trimCacheIfNeeded(): void {
  while (statusCache.size > MAX_CACHE_ENTRIES) {
    const first = statusCache.keys().next().value as string | undefined;
    if (!first) break;
    statusCache.delete(first);
  }
}

function pruneRateLimitKeys(): void {
  if (userRequestTimestamps.size <= MAX_RATE_TRACKED_USERS) return;
  const drop = Math.floor(userRequestTimestamps.size / 2);
  let i = 0;
  for (const k of Array.from(userRequestTimestamps.keys())) {
    userRequestTimestamps.delete(k);
    if (++i >= drop) break;
  }
}

/**
 * Returns whether this status request may proceed. Uses an in-memory sliding window per user.
 */
export function takeReportStatusRateLimit(
  userId: string,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  let stamps = userRequestTimestamps.get(userId);
  if (!stamps) {
    stamps = [];
    userRequestTimestamps.set(userId, stamps);
    pruneRateLimitKeys();
  }
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = stamps.filter((t) => t > windowStart);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = recent[0]!;
    const retryAfterMs = Math.max(50, RATE_LIMIT_WINDOW_MS - (now - oldest) + 25);
    userRequestTimestamps.set(userId, recent);
    return { ok: false, retryAfterMs };
  }
  recent.push(now);
  userRequestTimestamps.set(userId, recent);
  return { ok: true };
}

export function peekReportStatusCache(
  reportId: string,
  userId: string,
): { payload: ReportStatusCachePayload; remainingTtlMs: number } | null {
  const k = cacheKey(reportId, userId);
  const e = statusCache.get(k);
  const now = Date.now();
  if (!e || e.expiresAt <= now) return null;
  return { payload: { ...e.payload }, remainingTtlMs: Math.max(0, e.expiresAt - now) };
}

export function rememberReportStatusCache(
  reportId: string,
  userId: string,
  payload: ReportStatusCachePayload,
): void {
  trimCacheIfNeeded();
  const k = cacheKey(reportId, userId);
  statusCache.set(k, {
    expiresAt: Date.now() + REPORT_STATUS_CACHE_TTL_MS,
    payload: { ...payload },
  });
}

/**
 * Coalesce concurrent primary reads for the same (reportId, userId) on this instance.
 */
export function runReportStatusSingleflight<T>(reportId: string, userId: string, fn: () => Promise<T>): Promise<T> {
  const k = cacheKey(reportId, userId);
  const existing = inflightReads.get(k) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => {
    inflightReads.delete(k);
  });
  inflightReads.set(k, p);
  return p;
}

export function nextPollAfterMsForPayload(payload: ReportStatusCachePayload): number {
  const status = payload.status;
  if (status === 'complete' || status === 'error') return 0;
  return REPORT_STATUS_CACHE_TTL_MS;
}

export function finalizeReportStatusResponse(
  payload: ReportStatusCachePayload,
  opts: { servedFromCache: boolean; nextPollAfterMs: number },
): Record<string, unknown> {
  return {
    ...payload,
    served_from_cache: opts.servedFromCache,
    next_poll_after_ms: opts.nextPollAfterMs,
  };
}
