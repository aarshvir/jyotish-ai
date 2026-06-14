'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LineChart, StackedBars, Sparkline, type Point } from '@/components/admin/Charts';

type Kpi = { value: number; delta: number | null };
type Metrics = {
  range: { days: number };
  kpis: {
    signups: Kpi; activated: Kpi; paidCustomers: Kpi; revenueUsd: Kpi; paidConversion: Kpi; repeatBuyers: Kpi;
  };
  totals: { users: number; allTimeRevenueUsd: number };
  series: { signups: Point[]; reports: { label: string; a: number; b: number }[]; revenue: Point[] };
};

const RANGES = [7, 30, 90];

function Delta({ d, suffix = '%' }: { d: number | null; suffix?: string }) {
  if (d === null) return <span className="font-mono text-mono-sm text-dust/40">—</span>;
  const up = d >= 0;
  return (
    <span className={`font-mono text-mono-sm ${up ? 'text-success' : 'text-caution'}`}>
      {up ? '▲' : '▼'} {Math.abs(d)}{suffix}
    </span>
  );
}

function KpiCard({ label, display, delta, spark, sparkColor }: { label: string; display: string; delta: number | null; spark?: number[]; sparkColor?: string }) {
  return (
    <div className="card border border-horizon/40 rounded-card p-5">
      <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">{label}</div>
      <div className="flex items-end justify-between gap-2 mt-1">
        <div className="font-display text-3xl text-amber">{display}</div>
        {spark && spark.some((v) => v) ? <Sparkline data={spark} color={sparkColor} /> : null}
      </div>
      <div className="mt-1.5"><Delta d={delta} /> <span className="font-mono text-mono-sm text-dust/40">vs prev</span></div>
    </div>
  );
}

export default function AdminOverview() {
  const [days, setDays] = useState(30);
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setM(null);
    fetch(`/api/admin/metrics?days=${days}`)
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setM(j)))
      .catch(() => setErr('Failed to load'));
  }, [days]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl text-star">Overview</h1>
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

      {err && <p className="text-caution">{err}</p>}
      {!m && !err && <p className="text-dust">Loading…</p>}

      {m && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <KpiCard label="New signups" display={String(m.kpis.signups.value)} delta={m.kpis.signups.delta} spark={m.series.signups.map((p) => p.value)} />
            <KpiCard label="Activated" display={String(m.kpis.activated.value)} delta={m.kpis.activated.delta} sparkColor="var(--success)" />
            <KpiCard label="Paid customers" display={String(m.kpis.paidCustomers.value)} delta={m.kpis.paidCustomers.delta} />
            <KpiCard label="Net revenue" display={`$${Math.round(m.kpis.revenueUsd.value / 100).toLocaleString()}`} delta={m.kpis.revenueUsd.delta} spark={m.series.revenue.map((p) => p.value)} sparkColor="var(--amber)" />
            <KpiCard label="Free→paid conv." display={`${m.kpis.paidConversion.value}%`} delta={m.kpis.paidConversion.delta} />
            <KpiCard label="Repeat buyers" display={String(m.kpis.repeatBuyers.value)} delta={m.kpis.repeatBuyers.delta} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="card border border-horizon/40 rounded-card p-5">
              <h2 className="font-display text-lg text-star mb-1">Net revenue / day <span className="font-mono text-mono-sm text-dust/40">(USD)</span></h2>
              <LineChart points={m.series.revenue} valuePrefix="$" />
            </div>
            <div className="card border border-horizon/40 rounded-card p-5">
              <h2 className="font-display text-lg text-star mb-1">New signups / day</h2>
              <LineChart points={m.series.signups} color="var(--success)" />
            </div>
          </div>

          <div className="card border border-horizon/40 rounded-card p-5 mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-lg text-star">Reports / day</h2>
              <div className="flex items-center gap-4 font-mono text-mono-sm">
                <span className="text-dust/50">▮ free</span><span className="text-amber">▮ paid</span>
              </div>
            </div>
            <StackedBars points={m.series.reports} />
          </div>

          <FunnelSection />

          <p className="font-mono text-mono-sm text-dust/40 mt-6">
            {m.totals.users.toLocaleString()} total users · all-time revenue ${Math.round(m.totals.allTimeRevenueUsd / 100).toLocaleString()} ·{' '}
            <Link href="/admin/revenue" className="text-amber hover:underline">revenue detail →</Link>{' · '}
            <Link href="/admin/retention" className="text-amber hover:underline">retention →</Link>
          </p>
        </>
      )}
    </div>
  );
}

type Stage = { key: string; label: string; count: number; basis: string };

function FunnelSection() {
  const [stages, setStages] = useState<Stage[] | null>(null);
  const [note, setNote] = useState('');
  useEffect(() => {
    fetch('/api/admin/funnel')
      .then((r) => r.json())
      .then((j) => { if (!j.error) { setStages(j.stages); setNote(j.note ?? ''); } })
      .catch(() => {});
  }, []);
  if (!stages) return null;
  const top = stages[0]?.count || 0;
  // Find worst step drop (lowest step %) to highlight.
  let worst = -1, worstPct = 101;
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1].count || 1;
    const sp = Math.round((stages[i].count / prev) * 100);
    if (sp < worstPct) { worstPct = sp; worst = i; }
  }
  return (
    <div className="card border border-horizon/40 rounded-card p-5">
      <h2 className="font-display text-xl text-star mb-1">Conversion funnel</h2>
      <p className="font-mono text-mono-sm text-dust/40 mb-5">{note}</p>
      <div className="space-y-4">
        {stages.map((s, i) => {
          const pctOfTop = top ? Math.round((s.count / top) * 100) : 0;
          const prev = i > 0 ? stages[i - 1].count : s.count;
          const stepPct = prev ? Math.round((s.count / prev) * 100) : 100;
          const isWorst = i === worst;
          return (
            <div key={s.key}>
              <div className="flex justify-between font-body text-body-sm mb-1">
                <span className="text-star">{s.label} <span className="text-dust/40 font-mono text-mono-sm">({s.basis})</span></span>
                <span className="text-amber">{s.count} · {pctOfTop}%{i > 0 ? <span className={isWorst ? 'text-caution' : 'text-dust/50'}> · {stepPct}% step{isWorst ? ' ⚠ biggest drop' : ''}</span> : null}</span>
              </div>
              <div className="h-3 rounded-full bg-bg-3/40 overflow-hidden">
                <div className={`h-full rounded-full ${isWorst ? 'bg-caution/70' : 'bg-amber/70'}`} style={{ width: `${pctOfTop}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
