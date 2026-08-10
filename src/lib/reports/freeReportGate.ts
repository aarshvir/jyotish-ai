/**
 * One free/preview report per user — concurrency gate.
 *
 * `/api/reports/start` checks the free-report count before creating the row, but
 * that read is racy: two tabs can both observe count=0 and both insert. After the
 * upsert, re-read free/preview rows (oldest first) and keep only the winner.
 */

export type FreeReportClaimDecision = 'allow' | 'limit_reached';

/**
 * @param freeReportIdsOldestFirst - ids of this user's free/preview reports,
 *   ordered by created_at ASC, id ASC (stable tie-break).
 */
export function decideFreeReportClaim(args: {
  reportId: string;
  freeReportIdsOldestFirst: string[];
}): FreeReportClaimDecision {
  const ids = args.freeReportIdsOldestFirst;
  if (ids.length <= 1) return 'allow';
  // More than one free/preview row exists — only the oldest keeps the entitlement.
  return ids[0] === args.reportId ? 'allow' : 'limit_reached';
}
