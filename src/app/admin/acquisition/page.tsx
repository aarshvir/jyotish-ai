'use client';

import { useEffect, useState } from 'react';

type Acq = {
  totalSessions: number;
  channels: { key: string; count: number }[];
  landingPages: { key: string; count: number }[];
  referrers: { key: string; count: number }[];
  topPages: { path: string; views: number; sessions: number }[];
  note: string;
};

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

export default function AcquisitionPage() {
  const [d, setD] = useState<Acq | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/admin/acquisition').then((r) => r.json()).then((j) => (j.error ? setErr(j.error) : setD(j))).catch(() => setErr('Failed to load'));
  }, []);
  if (err) return <p className="text-caution">{err}</p>;
  if (!d) return <p className="text-dust">Loading…</p>;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-star">Acquisition <span className="font-mono text-mono-sm text-dust/40">({d.totalSessions.toLocaleString()} sessions)</span></h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card border border-horizon/40 rounded-card p-5">
          <h2 className="font-display text-xl text-star mb-4">Channels</h2>
          <Bars rows={d.channels} total={d.totalSessions} />
        </div>
        <div className="card border border-horizon/40 rounded-card p-5">
          <h2 className="font-display text-xl text-star mb-4">Top referrers</h2>
          <Bars rows={d.referrers} total={d.totalSessions} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card border border-horizon/40 rounded-card p-5">
          <h2 className="font-display text-xl text-star mb-4">Landing pages <span className="font-mono text-mono-sm text-dust/40">(entrances)</span></h2>
          <Bars rows={d.landingPages.map((p) => ({ key: p.key, count: p.count }))} total={d.totalSessions} />
        </div>
        <div className="card border border-horizon/40 rounded-card p-5">
          <h2 className="font-display text-xl text-star mb-4">Top pages <span className="font-mono text-mono-sm text-dust/40">(views)</span></h2>
          <div className="space-y-1.5 font-body text-body-sm">
            {d.topPages.map((p) => (
              <div key={p.path} className="flex justify-between gap-3">
                <span className="text-dust truncate">{p.path}</span>
                <span className="text-star shrink-0 tabular-nums">{p.views} <span className="text-dust/40 font-mono text-mono-sm">· {p.sessions} sess</span></span>
              </div>
            ))}
            {d.topPages.length === 0 && <p className="text-dust/60">No pageviews recorded yet.</p>}
          </div>
        </div>
      </div>

      <p className="font-mono text-mono-sm text-dust/40">{d.note}</p>
    </div>
  );
}
