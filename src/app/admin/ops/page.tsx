'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Ops = {
  summary: { failedReports: number; stuckReports: number; paidNotDelivered: number; failedPayments: number; stalePending: number };
  paidNotDelivered: { id: string; email: string; plan: string; status: string; at: string }[];
  failedReports: { id: string; email: string; plan: string; at: string }[];
  stuckReports: { id: string; email: string; plan: string; since: string }[];
  failedPayments: { id: string; plan: string; amount: number; currency: string; at: string }[];
};

const d = (s?: string) => (s ? new Date(s).toLocaleString() : '—');

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  const hot = value > 0 && danger;
  return (
    <div className={`card rounded-card p-5 border ${hot ? 'border-caution/50 bg-caution/[0.06]' : 'border-horizon/40'}`}>
      <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">{label}</div>
      <div className={`font-display text-3xl mt-1 ${hot ? 'text-caution' : value > 0 ? 'text-amber' : 'text-success'}`}>{value}</div>
    </div>
  );
}

function List({ title, rows, render }: { title: string; rows: Record<string, unknown>[]; render: (r: never) => React.ReactNode }) {
  if (!rows.length) return null;
  return (
    <div className="card border border-horizon/40 rounded-card p-5">
      <h2 className="font-display text-lg text-star mb-3">{title} <span className="font-mono text-mono-sm text-dust/40">(latest {rows.length})</span></h2>
      <div className="space-y-1.5 font-body text-body-sm">{rows.map((r, i) => <div key={i}>{render(r as never)}</div>)}</div>
    </div>
  );
}

export default function OpsPage() {
  const [d2, setD2] = useState<Ops | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/admin/ops').then((r) => r.json()).then((j) => (j.error ? setErr(j.error) : setD2(j))).catch(() => setErr('Failed to load'));
  }, []);
  if (err) return <p className="text-caution">{err}</p>;
  if (!d2) return <p className="text-dust">Loading…</p>;
  const s = d2.summary;
  const allClear = s.failedReports + s.stuckReports + s.paidNotDelivered + s.failedPayments + s.stalePending === 0;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-star">Ops &amp; health</h1>
      {allClear && <p className="text-success font-body text-body-md">✓ All clear — no failures or stuck jobs detected.</p>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label="Paid, not delivered" value={s.paidNotDelivered} danger />
        <Stat label="Failed reports" value={s.failedReports} danger />
        <Stat label="Stuck >15m" value={s.stuckReports} danger />
        <Stat label="Failed payments" value={s.failedPayments} />
        <Stat label="Stale pending" value={s.stalePending} />
      </div>

      <List title="⚠ Paid but not delivered (refund risk)" rows={d2.paidNotDelivered}
        render={(r: Ops['paidNotDelivered'][number]) => (
          <div className="flex justify-between gap-3">
            <span className="text-star">{r.email} <span className="text-dust/50">· {r.plan} · {r.status}</span></span>
            <span className="font-mono text-mono-sm text-dust/50">{d(r.at)} · <Link href={`/report/${r.id}`} className="text-amber hover:underline">open</Link></span>
          </div>
        )} />

      <List title="Failed report generations" rows={d2.failedReports}
        render={(r: Ops['failedReports'][number]) => (
          <div className="flex justify-between gap-3">
            <span className="text-star">{r.email} <span className="text-dust/50">· {r.plan}</span></span>
            <span className="font-mono text-mono-sm text-dust/50">{d(r.at)} · <Link href={`/report/${r.id}`} className="text-amber hover:underline">open</Link></span>
          </div>
        )} />

      <List title="Stuck generating" rows={d2.stuckReports}
        render={(r: Ops['stuckReports'][number]) => (
          <div className="flex justify-between gap-3">
            <span className="text-star">{r.email} <span className="text-dust/50">· {r.plan}</span></span>
            <span className="font-mono text-mono-sm text-dust/50">since {d(r.since)}</span>
          </div>
        )} />

      <List title="Failed payments" rows={d2.failedPayments}
        render={(r: Ops['failedPayments'][number]) => (
          <div className="flex justify-between gap-3">
            <span className="text-star">{r.plan} · {r.currency} {(r.amount / 100).toFixed(0)}</span>
            <span className="font-mono text-mono-sm text-dust/50">{d(r.at)}</span>
          </div>
        )} />
    </div>
  );
}
