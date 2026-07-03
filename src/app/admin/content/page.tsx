'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = { key: string; bucket: string; views: number; sessions: number; signups: number; signupPct: number; firstTouch: number };
type Bucket = { bucket: string; views: number; sessions: number; signups: number; signupPct: number; firstTouch: number };
type Content = {
  days: number;
  totalViews: number;
  totalSessions: number;
  rows: Row[];
  buckets: Bucket[];
  firstTouchAvailable: boolean;
  note: string;
};

const RANGES = [7, 30, 90];
type SortCol = 'key' | 'views' | 'sessions' | 'signups' | 'signupPct' | 'firstTouch';

function Bars({ rows, total }: { rows: { key: string; count: number }[]; total: number }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  if (!rows.length) return <p className="text-dust/60 text-body-sm">No data yet.</p>;
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="flex justify-between font-body text-body-sm mb-1">
            <span className="text-star truncate pr-2">{r.key}</span>
            <span className="text-amber shrink-0">{r.count} <span className="text-dust/40 font-mono text-mono-sm">· {total ? Math.round((r.count / total) * 100) : 0}%</span></span>
          </div>
          <div className="h-2 rounded-full bg-bg-3/40 overflow-hidden">
            <div className="h-full bg-amber/70 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ContentPage() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<Content | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sort, setSort] = useState<{ col: SortCol; dir: 1 | -1 }>({ col: 'views', dir: -1 });

  useEffect(() => {
    setD(null);
    fetch(`/api/admin/content?days=${days}`)
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setD(j)))
      .catch(() => setErr('Failed to load'));
  }, [days]);

  const sorted = useMemo(() => {
    if (!d) return [];
    const rows = [...d.rows];
    const { col, dir } = sort;
    rows.sort((a, b) => {
      if (col === 'key') return a.key.localeCompare(b.key) * dir;
      return (a[col] - b[col]) * dir;
    });
    return rows.slice(0, 20);
  }, [d, sort]);

  const clickSort = (col: SortCol) =>
    setSort((s) => (s.col === col ? { col, dir: s.dir === -1 ? 1 : -1 } : { col, dir: col === 'key' ? 1 : -1 }));

  if (err) return <p className="text-caution">{err}</p>;

  const th = (label: string, col: SortCol, align = 'text-right') => (
    <th
      className={`font-mono text-mono-sm text-dust/50 px-2 py-1.5 ${align} cursor-pointer select-none hover:text-star transition-colors whitespace-nowrap`}
      onClick={() => clickSort(col)}
    >
      {label}{sort.col === col ? (sort.dir === -1 ? ' ▼' : ' ▲') : ''}
    </th>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-star">
          Content{' '}
          {d && <span className="font-mono text-mono-sm text-dust/40">({d.totalViews.toLocaleString()} views · {d.totalSessions.toLocaleString()} sessions · {d.days}d)</span>}
        </h1>
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

      {!d && <p className="text-dust">Loading…</p>}

      {d && (
        <>
          <div className="card border border-horizon/40 rounded-card p-5 overflow-x-auto">
            <h2 className="font-display text-xl text-star mb-1">Top content <span className="font-mono text-mono-sm text-dust/40">(top 20 by current sort — click a column to re-sort)</span></h2>
            <p className="font-mono text-mono-sm text-dust/40 mb-4">Signups = accounts seen in sessions that viewed the page. 1st-touch = signups whose recorded landing page matches (all-time).</p>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-horizon/40">
                  {th('Path', 'key', 'text-left')}
                  <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5 text-left">Bucket</th>
                  {th('Views', 'views')}
                  {th('Sessions', 'sessions')}
                  {th('Signups', 'signups')}
                  {th('Signup %', 'signupPct')}
                  {th('1st-touch', 'firstTouch')}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.key} className="border-b border-horizon/20">
                    <td className="font-mono text-mono-sm text-star px-2 py-1.5 max-w-[280px] truncate" title={r.key}>{r.key}</td>
                    <td className="font-body text-body-sm text-dust px-2 py-1.5">{r.bucket}</td>
                    <td className="font-mono text-mono-sm text-star px-2 py-1.5 text-right tabular-nums">{r.views.toLocaleString()}</td>
                    <td className="font-mono text-mono-sm text-dust px-2 py-1.5 text-right tabular-nums">{r.sessions.toLocaleString()}</td>
                    <td className={`font-mono text-mono-sm px-2 py-1.5 text-right tabular-nums ${r.signups > 0 ? 'text-success' : 'text-dust/40'}`}>{r.signups}</td>
                    <td className="font-mono text-mono-sm text-amber px-2 py-1.5 text-right tabular-nums">{r.sessions ? `${r.signupPct}%` : '—'}</td>
                    <td className={`font-mono text-mono-sm px-2 py-1.5 text-right tabular-nums ${r.firstTouch > 0 ? 'text-success' : 'text-dust/40'}`}>{r.firstTouch}</td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr><td colSpan={7} className="text-dust/60 text-body-sm px-2 py-4">No page views recorded in this window yet.</td></tr>
                )}
              </tbody>
            </table>
            {!d.firstTouchAvailable && (
              <p className="font-mono text-mono-sm text-dust/40 mt-3">1st-touch column unavailable — run the 20260615_first_touch_attribution.sql migration.</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card border border-horizon/40 rounded-card p-5">
              <h2 className="font-display text-xl text-star mb-4">Views by bucket</h2>
              <Bars rows={d.buckets.map((b) => ({ key: b.bucket, count: b.views }))} total={d.totalViews} />
            </div>
            <div className="card border border-horizon/40 rounded-card p-5 overflow-x-auto">
              <h2 className="font-display text-xl text-star mb-4">Bucket rollup</h2>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-horizon/40">
                    <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5">Bucket</th>
                    <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5 text-right">Views</th>
                    <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5 text-right">Sessions</th>
                    <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5 text-right">Signups</th>
                    <th className="font-mono text-mono-sm text-dust/50 px-2 py-1.5 text-right">Signup %</th>
                  </tr>
                </thead>
                <tbody>
                  {d.buckets.map((b) => (
                    <tr key={b.bucket} className="border-b border-horizon/20">
                      <td className="font-body text-body-sm text-star px-2 py-1.5">{b.bucket}</td>
                      <td className="font-mono text-mono-sm text-star px-2 py-1.5 text-right tabular-nums">{b.views.toLocaleString()}</td>
                      <td className="font-mono text-mono-sm text-dust px-2 py-1.5 text-right tabular-nums">{b.sessions.toLocaleString()}</td>
                      <td className={`font-mono text-mono-sm px-2 py-1.5 text-right tabular-nums ${b.signups > 0 ? 'text-success' : 'text-dust/40'}`}>{b.signups}</td>
                      <td className="font-mono text-mono-sm text-amber px-2 py-1.5 text-right tabular-nums">{b.sessions ? `${b.signupPct}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="font-mono text-mono-sm text-dust/40">{d.note}</p>
        </>
      )}
    </div>
  );
}
