/**
 * Concurrent-safe patches for reports.report_data.
 *
 * Several on-demand routes (teaser / personalized / hourly-day) used to
 * read–modify–write the whole JSON blob from a stale snapshot. That races with
 * monthly upgrade extension: the UI invites buyers to open the report while
 * days 8–30 are still appending, and a late write of a 7-day snapshot destroys
 * the paid extension (plan_type stays `monthly`, days shrink back to 7).
 *
 * Strategy: re-read immediately before each write, apply a mutator to the fresh
 * row, refuse to shrink `days`, and retry on updated_at conflicts.
 */

export type ReportDataBlob = Record<string, unknown>;

export function daysLength(data: ReportDataBlob | null | undefined): number {
  const days = data?.days;
  return Array.isArray(days) ? days.length : 0;
}

/**
 * Ensure a mutator cannot shrink the forecast day array (the monthly-upgrade wipe).
 * Top-level keys from `next` win; `days` is taken from `next` only when it is at
 * least as long as `current.days`.
 */
export function preserveDaysIfShrunk(
  current: ReportDataBlob,
  next: ReportDataBlob,
): ReportDataBlob {
  if (daysLength(next) < daysLength(current)) {
    return { ...next, days: current.days };
  }
  return next;
}

export type PatchReportDataResult =
  | { ok: true; attempts: number }
  | { ok: false; error: string; attempts: number };

type PatchDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder is intentionally structural here
  from: (table: string) => any;
};

/**
 * Atomically patch report_data with optimistic concurrency on updated_at.
 */
export async function patchReportData(
  db: PatchDb,
  reportId: string,
  mutator: (current: ReportDataBlob) => ReportDataBlob,
  opts?: { maxAttempts?: number },
): Promise<PatchReportDataResult> {
  const maxAttempts = opts?.maxAttempts ?? 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data: row, error: readErr } = await db
      .from('reports')
      .select('report_data, updated_at')
      .eq('id', reportId)
      .maybeSingle();

    if (readErr) {
      return { ok: false, error: String(readErr.message ?? readErr), attempts: attempt };
    }
    if (!row) {
      return { ok: false, error: 'Report not found', attempts: attempt };
    }

    const current = (row.report_data && typeof row.report_data === 'object'
      ? (row.report_data as ReportDataBlob)
      : {}) as ReportDataBlob;

    let next: ReportDataBlob;
    try {
      next = preserveDaysIfShrunk(current, mutator(current));
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        attempts: attempt,
      };
    }

    const updatedAt = new Date().toISOString();
    let writeQuery = db
      .from('reports')
      .update({ report_data: next, updated_at: updatedAt })
      .eq('id', reportId);

    // Optimistic lock when we have a prior updated_at. On the final attempt, skip the
    // lock so a timestamptz round-trip mismatch cannot permanently block persistence —
    // preserveDaysIfShrunk still prevents a days wipe.
    const useLock = row.updated_at != null && attempt < maxAttempts;
    if (useLock) {
      writeQuery = writeQuery.eq('updated_at', row.updated_at);
    }

    const { data: updated, error: writeErr } = await writeQuery.select('id').maybeSingle();

    if (writeErr) {
      return { ok: false, error: String(writeErr.message ?? writeErr), attempts: attempt };
    }
    if (updated || !useLock) {
      return { ok: true, attempts: attempt };
    }
    // Conflict: another writer won — retry with a fresh read.
  }

  return {
    ok: false,
    error: `report_data patch conflict after ${maxAttempts} attempts`,
    attempts: maxAttempts,
  };
}

/**
 * Merge newly generated forecast days onto a fresh report_data blob by date.
 * Existing days for the same date keep their current object (hourly prose etc.);
 * new dates are appended. Never drops dates already present on `fresh`.
 */
export function mergeForecastDaysByDate(
  fresh: ReportDataBlob,
  newDays: Array<Record<string, unknown>>,
): ReportDataBlob {
  const existing = Array.isArray(fresh.days) ? (fresh.days as Array<Record<string, unknown>>) : [];
  const byDate = new Map<string, Record<string, unknown>>();
  for (const d of existing) {
    const date = typeof d?.date === 'string' ? d.date : '';
    if (date) byDate.set(date, d);
  }
  for (const d of newDays) {
    const date = typeof d?.date === 'string' ? d.date : '';
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, d);
  }
  const days = Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  return { ...fresh, days };
}
