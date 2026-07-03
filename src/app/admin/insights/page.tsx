'use client';

import { useEffect, useState } from 'react';
import { LineChart } from '@/components/admin/Charts';

type Matrix = Record<'clear' | 'middle' | 'heavy', Record<'clearer' | 'asExpected' | 'heavier', number>>;
type Resonance =
  | { available: false; reason: string }
  | {
      available: true;
      n: number;
      totalRatings: number;
      aligned: number;
      alignmentPct: number | null;
      byRating: { clearer: number; asExpected: number; heavier: number };
      matrix: Matrix;
      bands: { clearMin: number; heavyMax: number };
    };
type Insights = {
  days: number;
  resonance: Resonance;
  plans: { plan: string; isFree: boolean; total: number; paid: number; paidPct: number }[];
  feedback: { weeks: { week: string; count: number; ratedCount: number; avgRating: number | null }[]; error: string | null };
  note: string;
};

const RANGES = [7, 30, 90];
const BAND_ROWS: { band: 'clear' | 'middle' | 'heavy'; label: string }[] = [
  { band: 'clear', label: 'Clear (≥65)' },
  { band: 'middle', label: 'Middle (50–64)' },
  { band: 'heavy', label: 'Heavy (<50)' },
];
const FELT_COLS: { felt: 'clearer' | 'asExpected' | 'heavier'; label: string }[] = [
  { felt: 'clearer', label: 'Felt clearer' },
  { felt: 'asExpected', label: 'As expected' },
  { felt: 'heavier', label: 'Felt heavier' },
];
/** Diagonal = predicted band matched the felt rating. */
const ALIGNED: Record<string, string> = { 'clear|clearer': '1', 'middle|asExpected': '1', 'heavy|heavier': '1' };

function matrixCell(v: number, aligned: boolean): string {
  if (v === 0) return 'bg-bg-3/40 text-dust/40';
  if (aligned) return 'bg-success/60 text-space';
  return 'bg-amber/25 text-amber';
}

export default function InsightsPage() {
  const [days, setDays] = useState(90);
  const [d, setD] = useState<Insights | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setD(null);
    fetch(`/api/admin/insights?days=${days}`)
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setD(j)))
      .catch(() => setErr('Failed to load'));
  }, [days]);

  if (err) return <p className="text-caution">{err}</p>;
  if (!d) return <p className="text-dust">Loading…</p>;

  const res = d.resonance;
  const noRatings = res.available && res.totalRatings === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-star">Insights</h1>
        <div className="flex items-center gap-1 rounded-button border border-horizon/40 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`font-mono text-mono-sm px-3 py-1 rounded-sm transition-colors ${days === r ? 'bg-amber text-space' : 'text-dust hover:text-star'}`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* (a) Resonance — predicted vs felt */}
      <div className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-1">Resonance <span className="font-mono text-mono-sm text-dust/40">(predicted band vs felt rating, all-time)</span></h2>
        {!res.available || noRatings ? (
          <div className="py-8 text-center">
            <p className="font-body text-body-md text-dust">
              Resonance data starts accruing once the day_ratings migration is applied and users rate days.
            </p>
            <p className="font-mono text-mono-sm text-dust/40 mt-2">
              {!res.available ? res.reason : 'Table is live — no ratings submitted yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-6">
              {[
                ['Rated days', String(res.totalRatings)],
                ['With score snapshot', String(res.n)],
                ['Aligned', String(res.aligned)],
                ['Alignment', res.alignmentPct === null ? '—' : `${res.alignmentPct}%`],
              ].map(([l, v]) => (
                <div key={l} className="border border-horizon/40 rounded-card p-4">
                  <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">{l}</div>
                  <div className="font-display text-2xl text-amber mt-1">{v}</div>
                </div>
              ))}
            </div>
            {res.alignmentPct === null && (
              <p className="font-mono text-mono-sm text-dust/40 mb-4">Alignment % appears once ≥30 ratings carry a predicted-score snapshot.</p>
            )}
            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-1 text-center">
                <thead>
                  <tr>
                    <th className="font-mono text-mono-sm text-dust/50 text-left pr-3">Predicted band</th>
                    {FELT_COLS.map((c) => (
                      <th key={c.felt} className="font-mono text-mono-sm text-dust/50 px-2 w-28">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BAND_ROWS.map((r) => (
                    <tr key={r.band}>
                      <td className="font-mono text-mono-sm text-dust text-left pr-3 whitespace-nowrap">{r.label}</td>
                      {FELT_COLS.map((c) => {
                        const v = res.matrix[r.band][c.felt];
                        const aligned = Boolean(ALIGNED[`${r.band}|${c.felt}`]);
                        return (
                          <td key={c.felt} className={`font-mono text-[12px] rounded w-28 h-10 ${matrixCell(v, aligned)}`}>
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="font-mono text-mono-sm text-dust/40 mt-3">
              Green diagonal = felt rating matched the predicted band. Framing is alignment/reflection — never accuracy claims.
            </p>
          </>
        )}
      </div>

      {/* (b) Conversion by plan */}
      <div className="card border border-horizon/40 rounded-card p-5 overflow-x-auto">
        <h2 className="font-display text-xl text-star mb-1">Conversion by plan <span className="font-mono text-mono-sm text-dust/40">(reports created, last {d.days}d)</span></h2>
        <table className="w-full text-left mt-3">
          <thead>
            <tr className="border-b border-horizon/40">
              <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5">Plan</th>
              <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5 text-right">Reports</th>
              <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5 text-right">Paid</th>
              <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5 text-right">Paid %</th>
            </tr>
          </thead>
          <tbody>
            {d.plans.map((p) => (
              <tr key={p.plan} className="border-b border-horizon/20">
                <td className="font-mono text-mono-sm text-star px-2 py-1.5">{p.plan}{p.isFree && <span className="text-dust/40"> · free</span>}</td>
                <td className="font-mono text-mono-sm text-star px-2 py-1.5 text-right tabular-nums">{p.total.toLocaleString()}</td>
                <td className={`font-mono text-mono-sm px-2 py-1.5 text-right tabular-nums ${p.paid > 0 ? 'text-success' : 'text-dust/40'}`}>{p.paid}</td>
                <td className="font-mono text-mono-sm text-amber px-2 py-1.5 text-right tabular-nums">{p.isFree ? '—' : `${p.paidPct}%`}</td>
              </tr>
            ))}
            {d.plans.length === 0 && (
              <tr><td colSpan={4} className="text-dust/60 text-body-sm px-2 py-4">No reports created in this window.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* (c) Feedback trend */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card border border-horizon/40 rounded-card p-5">
          <h2 className="font-display text-xl text-star mb-1">Feedback volume / week <span className="font-mono text-mono-sm text-dust/40">(last 8 weeks)</span></h2>
          <LineChart points={d.feedback.weeks.map((w) => ({ label: w.week.slice(5), value: w.count }))} />
        </div>
        <div className="card border border-horizon/40 rounded-card p-5 overflow-x-auto">
          <h2 className="font-display text-xl text-star mb-1">Avg rating / week <span className="font-mono text-mono-sm text-dust/40">(1–5, shown at n≥3)</span></h2>
          <table className="w-full text-left mt-3">
            <thead>
              <tr className="border-b border-horizon/40">
                <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5">Week of</th>
                <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5 text-right">Feedback</th>
                <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5 text-right">Rated</th>
                <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5 text-right">Avg rating</th>
              </tr>
            </thead>
            <tbody>
              {d.feedback.weeks.map((w) => (
                <tr key={w.week} className="border-b border-horizon/20">
                  <td className="font-mono text-mono-sm text-dust px-2 py-1.5 whitespace-nowrap">{w.week}</td>
                  <td className="font-mono text-mono-sm text-star px-2 py-1.5 text-right tabular-nums">{w.count}</td>
                  <td className="font-mono text-mono-sm text-dust px-2 py-1.5 text-right tabular-nums">{w.ratedCount}</td>
                  <td className="font-mono text-mono-sm text-amber px-2 py-1.5 text-right tabular-nums">
                    {w.avgRating !== null && w.ratedCount >= 3 ? w.avgRating.toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {d.feedback.error && <p className="font-mono text-mono-sm text-dust/40 mt-3">Feedback query error: {d.feedback.error}</p>}
        </div>
      </div>

      <p className="font-mono text-mono-sm text-dust/40">{d.note}</p>
    </div>
  );
}
