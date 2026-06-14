'use client';

import { useEffect, useState } from 'react';

type Revenue = {
  totalUsd: number;
  orders: number;
  aovUsd: number;
  couponOrders: number;
  byPlan: { plan: string; orders: number; usd: number }[];
  byCurrency: { currency: string; orders: number; minor: number }[];
  coupons: { code: string; uses: number; giveawayUsd: number }[];
  refunds: { note: string; count: number };
};

const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const money = (c: string, minor: number) => {
  const v = minor / 100;
  if (c === 'INR') return `₹${Math.round(v).toLocaleString('en-IN')}`;
  if (c === 'AED') return `AED ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

export default function RevenuePage() {
  const [d, setD] = useState<Revenue | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/admin/revenue').then((r) => r.json()).then((j) => (j.error ? setErr(j.error) : setD(j))).catch(() => setErr('Failed to load'));
  }, []);
  if (err) return <p className="text-caution">{err}</p>;
  if (!d) return <p className="text-dust">Loading…</p>;

  const planMax = Math.max(...d.byPlan.map((p) => p.usd), 1);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-star">Revenue</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Net revenue (all-time)', usd(d.totalUsd)],
          ['Paid orders', String(d.orders)],
          ['Avg order value', usd(d.aovUsd)],
          ['Coupon orders', `${d.couponOrders}`],
        ].map(([l, v]) => (
          <div key={l} className="card border border-horizon/40 rounded-card p-5">
            <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">{l}</div>
            <div className="font-display text-2xl text-amber mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-4">Revenue by plan <span className="font-mono text-mono-sm text-dust/40">(USD-normalized)</span></h2>
        {d.byPlan.length === 0 ? <p className="text-dust/60">No paid orders yet.</p> : (
          <div className="space-y-3">
            {d.byPlan.map((p) => (
              <div key={p.plan}>
                <div className="flex justify-between font-body text-body-sm mb-1">
                  <span className="text-star capitalize">{p.plan}</span>
                  <span className="text-amber">{usd(p.usd)} <span className="text-dust/40 font-mono text-mono-sm">· {p.orders} orders</span></span>
                </div>
                <div className="h-2.5 rounded-full bg-bg-3/40 overflow-hidden">
                  <div className="h-full bg-amber/70 rounded-full" style={{ width: `${(p.usd / planMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card border border-horizon/40 rounded-card p-5">
          <h2 className="font-display text-xl text-star mb-3">By currency <span className="font-mono text-mono-sm text-dust/40">(raw)</span></h2>
          {d.byCurrency.length === 0 ? <p className="text-dust/60">—</p> : (
            <div className="space-y-2">
              {d.byCurrency.map((c) => (
                <div key={c.currency} className="flex justify-between font-body text-body-sm">
                  <span className="text-dust">{c.currency} <span className="text-dust/40 font-mono text-mono-sm">· {c.orders}</span></span>
                  <span className="text-star">{money(c.currency, c.minor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card border border-horizon/40 rounded-card p-5">
          <h2 className="font-display text-xl text-star mb-3">Coupon cost</h2>
          {d.coupons.length === 0 ? <p className="text-dust/60">No coupon redemptions yet.</p> : (
            <div className="space-y-2">
              {d.coupons.map((c) => (
                <div key={c.code} className="flex justify-between font-body text-body-sm">
                  <span className="text-dust font-mono">{c.code} <span className="text-dust/40">· {c.uses} uses</span></span>
                  <span className="text-caution">−{usd(c.giveawayUsd)} given away</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="font-mono text-mono-sm text-dust/40">{d.refunds.note}</p>
    </div>
  );
}
