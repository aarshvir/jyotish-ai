'use client';

import { useEffect, useState } from 'react';

type Overview = {
  signups: number;
  signupsLast7: number;
  reports: number;
  paidOrders: number;
  kundalis: number;
  synastries: number;
  activeCoupons: number;
  revenue: Record<string, number>;
};

function fmtMoney(currency: string, minor: number): string {
  const major = minor / 100;
  if (currency === 'INR') return `₹${Math.round(major).toLocaleString('en-IN')}`;
  if (currency === 'AED') return `AED ${major.toFixed(2)}`;
  return `$${major.toFixed(2)}`;
}

export default function AdminOverview() {
  const [d, setD] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setD(j)))
      .catch(() => setErr('Failed to load'));
  }, []);

  if (err) return <p className="text-caution">{err}</p>;
  if (!d) return <p className="text-dust">Loading…</p>;

  const cards: [string, number][] = [
    ['Signups', d.signups],
    ['Signups (7d)', d.signupsLast7],
    ['Paid orders', d.paidOrders],
    ['Active coupons', d.activeCoupons],
    ['Forecasts', d.reports],
    ['Kundalis', d.kundalis],
    ['Matches', d.synastries],
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-star mb-6">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(([label, val]) => (
          <div key={label} className="card border border-horizon/40 rounded-card p-5">
            <div className="font-display text-3xl text-amber">{val}</div>
            <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider mt-1">{label}</div>
          </div>
        ))}
      </div>
      <div className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-3">Revenue (completed payments)</h2>
        {Object.keys(d.revenue).length === 0 ? (
          <p className="text-dust">No paid orders yet.</p>
        ) : (
          <div className="flex flex-wrap gap-8">
            {Object.entries(d.revenue).map(([c, minor]) => (
              <div key={c}>
                <span className="font-display text-2xl text-amber">{fmtMoney(c, minor)}</span>{' '}
                <span className="font-mono text-mono-sm text-dust/50">{c}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
