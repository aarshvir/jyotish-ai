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
