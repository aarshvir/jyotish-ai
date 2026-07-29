import { describe, expect, it } from 'vitest';
import {
  daysLength,
  mergeForecastDaysByDate,
  patchReportData,
  preserveDaysIfShrunk,
  type ReportDataBlob,
} from '@/lib/reports/patchReportData';

describe('preserveDaysIfShrunk', () => {
  it('keeps current.days when a stale mutator would shrink the forecast', () => {
    const current: ReportDataBlob = {
      days: Array.from({ length: 30 }, (_, i) => ({ date: `2026-03-${String(i + 1).padStart(2, '0')}` })),
      personalized: { tier: 'full' },
    };
    const staleSeven: ReportDataBlob = {
      days: Array.from({ length: 7 }, (_, i) => ({ date: `2026-03-${String(i + 1).padStart(2, '0')}` })),
      personalized: { tier: 'full', full_answer: 'answer' },
    };
    const merged = preserveDaysIfShrunk(current, staleSeven);
    expect(daysLength(merged)).toBe(30);
    expect(merged.personalized).toEqual(staleSeven.personalized);
  });

  it('allows growth and same-length day updates', () => {
    const current: ReportDataBlob = { days: [{ date: '2026-03-01' }] };
    const grown = preserveDaysIfShrunk(current, {
      days: [{ date: '2026-03-01' }, { date: '2026-03-02' }],
    });
    expect(daysLength(grown)).toBe(2);

    const same = preserveDaysIfShrunk(current, {
      days: [{ date: '2026-03-01', ai_prose: true }],
    });
    expect((same.days as Array<Record<string, unknown>>)[0].ai_prose).toBe(true);
  });
});

describe('mergeForecastDaysByDate', () => {
  it('appends new dates and preserves upgraded existing days', () => {
    const fresh: ReportDataBlob = {
      teaser: { days: [] },
      days: [{ date: '2026-03-01', ai_prose: true, slots: [{ commentary: 'kept' }] }],
    };
    const merged = mergeForecastDaysByDate(fresh, [
      { date: '2026-03-01', slots: [{ commentary: 'stale' }] },
      { date: '2026-03-02', day_score: 70 },
    ]);
    const days = merged.days as Array<Record<string, unknown>>;
    expect(days).toHaveLength(2);
    expect(days[0].ai_prose).toBe(true);
    expect((days[0].slots as Array<Record<string, unknown>>)[0].commentary).toBe('kept');
    expect(days[1].day_score).toBe(70);
    expect(merged.teaser).toEqual({ days: [] });
  });
});

describe('patchReportData', () => {
  it('retries on updated_at conflict and merges onto the fresh row', async () => {
    const store: {
      report_data: ReportDataBlob;
      updated_at: string;
    } = {
      report_data: {
        days: Array.from({ length: 7 }, (_, i) => ({ date: `2026-03-${String(i + 1).padStart(2, '0')}` })),
      },
      updated_at: '2026-03-01T00:00:00.000Z',
    };

    let writeCount = 0;
    const db = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return {
                      data: {
                        report_data: store.report_data,
                        updated_at: store.updated_at,
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
          update(payload: { report_data: ReportDataBlob; updated_at: string }) {
            const filters: Record<string, unknown> = {};
            const builder = {
              eq(column: string, value: unknown) {
                filters[column] = value;
                return builder;
              },
              select() {
                return {
                  async maybeSingle() {
                    writeCount += 1;
                    if (writeCount === 1) {
                      // Concurrent extend wins between our read and write.
                      store.report_data = {
                        days: Array.from({ length: 30 }, (_, i) => ({
                          date: `2026-03-${String(i + 1).padStart(2, '0')}`,
                        })),
                      };
                      store.updated_at = '2026-03-01T00:01:00.000Z';
                      return { data: null, error: null };
                    }
                    expect(filters.updated_at).toBe(store.updated_at);
                    store.report_data = payload.report_data;
                    store.updated_at = payload.updated_at;
                    return { data: { id: 'r1' }, error: null };
                  },
                };
              },
            };
            return builder;
          },
        };
      },
    };

    const result = await patchReportData(db, 'r1', (current) => ({
      ...current,
      personalized: { tier: 'preview', teaser: 'hello there this is long enough' },
    }));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toBe(2);
    expect(daysLength(store.report_data)).toBe(30);
    expect(store.report_data.personalized).toEqual({
      tier: 'preview',
      teaser: 'hello there this is long enough',
    });
  });

  it('blocks a mutator that returns a shrunken days array on a single attempt', async () => {
    const store: ReportDataBlob = {
      days: Array.from({ length: 30 }, (_, i) => ({ date: `2026-03-${String(i + 1).padStart(2, '0')}` })),
    };
    const db = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return {
                      data: { report_data: store, updated_at: 't0' },
                      error: null,
                    };
                  },
                };
              },
            };
          },
          update(payload: { report_data: ReportDataBlob }) {
            const builder = {
              eq() {
                return builder;
              },
              select() {
                return {
                  async maybeSingle() {
                    store.days = payload.report_data.days;
                    store.personalized = payload.report_data.personalized;
                    return { data: { id: 'r1' }, error: null };
                  },
                };
              },
            };
            return builder;
          },
        };
      },
    };

    const result = await patchReportData(db, 'r1', () => ({
      days: Array.from({ length: 7 }, (_, i) => ({ date: `2026-03-${String(i + 1).padStart(2, '0')}` })),
      personalized: { tier: 'full' },
    }));

    expect(result.ok).toBe(true);
    expect(daysLength(store)).toBe(30);
    expect(store.personalized).toEqual({ tier: 'full' });
  });
});
