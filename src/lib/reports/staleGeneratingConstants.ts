/**
 * Stale "generating" detection uses `updated_at` as a heartbeat: orchestrator
 * progress steps bump it. Default window allows p99 7-day + commentary (45–90+ min).
 * Do not set below ~90 without risking false fails on healthy runs.
 *
 * Override: STALE_ORPHAN_UPDATED_AT_MINUTES (e.g. 180 for 3h)
 */
const DEFAULT_MINUTES = 120;
const FLOOR_MINUTES = 30;

export function getStaleOrphanUpdatedAtMs(): number {
  const raw = process.env.STALE_ORPHAN_UPDATED_AT_MINUTES;
  const m = raw != null && String(raw).trim() !== '' ? parseInt(String(raw), 10) : DEFAULT_MINUTES;
  if (!Number.isFinite(m) || m < FLOOR_MINUTES) {
    return DEFAULT_MINUTES * 60 * 1000;
  }
  return m * 60 * 1000;
}

/** True when `updated_at` is still inside the orphan window (the pipeline is heartbeating). */
export function hasFreshGeneratingHeartbeat(
  updatedAt: string | null | undefined,
  nowMs: number = Date.now(),
  staleMs: number = getStaleOrphanUpdatedAtMs(),
): boolean {
  if (typeof updatedAt !== 'string' || updatedAt.trim() === '') return false;
  const t = new Date(updatedAt).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t < staleMs;
}

/**
 * A client `forceRestart` must not wipe checkpoints of a pipeline that is still
 * writing. Healthy paid runs are 45–90+ minutes; the report page used to restart
 * any `generating` row whose `generation_started_at` was older than 40 minutes.
 */
export function shouldDeferForceRestart(
  row: { status?: string | null; updated_at?: string | null } | null | undefined,
  nowMs: number = Date.now(),
  staleMs: number = getStaleOrphanUpdatedAtMs(),
): boolean {
  return row?.status === 'generating' && hasFreshGeneratingHeartbeat(row.updated_at, nowMs, staleMs);
}
