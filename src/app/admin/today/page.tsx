'use client';

import { useEffect, useState } from 'react';

type Kpi = { today: number; yesterday: number; delta: number | null };
type Data = {
  asOf: string;
  kpis: { sessions: Kpi; pageViews: Kpi; toolViews: Kpi; signups: Kpi; reports: Kpi; revenueUsdCents: Kpi };
  note: string;
};

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function Delta({ d }: { d: number | null }) {
  if (d === null) return <span className="font-mono text-mono-sm text-dust/40">—</span>;
  const up = d >= 0;
  return (
    <span className={`font-mono text-mono-sm ${up ? 'text-success' : 'text-caution'}`}>
      {up ? '▲' : '▼'} {Math.abs(d)}%
    </span>
  );
}

function KpiCard({ label, kpi, fmt }: { label: string; kpi: Kpi; fmt?: (n: number) => string }) {
  const f = fmt ?? ((n: number) => n.toLocaleString());
  return (
    <div className="card border border-horizon/40 rounded-card p-5">
      <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">{label}</div>
      <div className="font-display text-3xl text-amber mt-1">{f(kpi.today)}</div>
      <div className="mt-1.5">
        <Delta d={kpi.delta} />{' '}
        <span className="font-mono text-mono-sm text-dust/40">vs {f(kpi.yesterday)} same time yesterday</span>
      </div>
    </div>
  );
}

export default function TodayPage() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/admin/today', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return;
          if (j.error) setErr(j.error);
          else { setErr(null); setD(j); }
        })
        .catch(() => { if (alive) setErr('Failed to load'); });
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (err) return <p className="text-caution">{err}</p>;
  if (!d) return <p className="text-dust">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl text-star">Today <span className="font-mono text-mono-sm text-dust/40">(launch-day pulse)</span></h1>
        <span className="font-mono text-mono-sm text-dust/40">as of {new Date(d.asOf).toLocaleTimeString()} · refreshes every 60s</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Sessions" kpi={d.kpis.sessions} />
        <KpiCard label="Page views" kpi={d.kpis.pageViews} />
        <KpiCard label="Tool page views" kpi={d.kpis.toolViews} />
        <KpiCard label="Signups" kpi={d.kpis.signups} />
        <KpiCard label="Reports created" kpi={d.kpis.reports} />
        <KpiCard label="Revenue" kpi={d.kpis.revenueUsdCents} fmt={usd} />
      </div>

      <p className="font-mono text-mono-sm text-dust/40">{d.note}</p>
    </div>
  );
}
