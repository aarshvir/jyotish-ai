'use client';

import { useEffect, useState } from 'react';

type Retention = {
  headline: { totalUsers: number; activationRate: number; payingUsers: number; repeatPurchaseRate: number };
  cohorts: { week: string; size: number; retention: (number | null)[] }[];
  weeks: number;
};

function cell(v: number | null): string {
  if (v === null) return 'bg-transparent text-transparent';
  if (v === 0) return 'bg-bg-3/40 text-dust/40';
  if (v >= 60) return 'bg-success/80 text-space';
  if (v >= 30) return 'bg-success/45 text-space';
  if (v >= 10) return 'bg-amber/45 text-space';
  return 'bg-amber/20 text-amber';
}

export default function RetentionPage() {
  const [d, setD] = useState<Retention | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/admin/retention').then((r) => r.json()).then((j) => (j.error ? setErr(j.error) : setD(j))).catch(() => setErr('Failed to load'));
  }, []);
  if (err) return <p className="text-caution">{err}</p>;
  if (!d) return <p className="text-dust">Loading…</p>;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-star">Retention</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Total users', String(d.headline.totalUsers)],
          ['Activation rate', `${d.headline.activationRate}%`],
          ['Paying users', String(d.headline.payingUsers)],
          ['Repeat-purchase rate', `${d.headline.repeatPurchaseRate}%`],
        ].map(([l, v]) => (
          <div key={l} className="card border border-horizon/40 rounded-card p-5">
            <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">{l}</div>
            <div className="font-display text-2xl text-amber mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="card border border-horizon/40 rounded-card p-5 overflow-x-auto">
        <h2 className="font-display text-xl text-star mb-1">Weekly signup cohorts</h2>
        <p className="font-mono text-mono-sm text-dust/40 mb-4">% of each signup cohort who generated a report or paid, by week since signup.</p>
        <table className="border-separate border-spacing-1 text-center">
          <thead>
            <tr>
              <th className="font-mono text-mono-sm text-dust/50 text-left pr-3">Cohort</th>
              <th className="font-mono text-mono-sm text-dust/50 px-2">Size</th>
              {Array.from({ length: d.weeks }, (_, k) => (
                <th key={k} className="font-mono text-mono-sm text-dust/50 w-12">W{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.cohorts.map((c) => (
              <tr key={c.week}>
                <td className="font-mono text-mono-sm text-dust text-left pr-3 whitespace-nowrap">wk {c.week}</td>
                <td className="font-mono text-mono-sm text-star px-2">{c.size}</td>
                {Array.from({ length: d.weeks }, (_, k) => {
                  const v = c.retention[k] ?? null;
                  return (
                    <td key={k} className={`font-mono text-[11px] rounded w-12 h-9 ${cell(v)}`}>
                      {v === null ? '' : `${v}%`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-mono-sm text-dust/40">
        Return signal = generated a report or made a payment. Repeat usage is naturally low for one-time products; the renewal lever is the Forecast plans (model them as subscriptions to track true retention).
      </p>
    </div>
  );
}
