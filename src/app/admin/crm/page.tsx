'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Customer = {
  userId: string; email: string; name: string; phone: string;
  reports: number; lastPlan: string; paidEver: boolean; spendUsd: number; lastActivity: string;
};

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const d = (s?: string) => (s ? new Date(s).toLocaleDateString() : '—');

export default function CrmPage() {
  const [list, setList] = useState<Customer[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [paidOnly, setPaidOnly] = useState(false);
  useEffect(() => {
    fetch('/api/admin/crm').then((r) => r.json()).then((j) => (j.error ? setErr(j.error) : setList(j.customers))).catch(() => setErr('Failed to load'));
  }, []);
  if (err) return <p className="text-caution">{err}</p>;
  if (!list) return <p className="text-dust">Loading…</p>;
  const rows = paidOnly ? list.filter((c) => c.paidEver) : list;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-3xl text-star">Call list <span className="font-mono text-mono-sm text-dust/40">({list.length} with phone)</span></h1>
        <label className="flex items-center gap-2 font-body text-body-sm text-dust cursor-pointer">
          <input type="checkbox" className="accent-amber" checked={paidOnly} onChange={(e) => setPaidOnly(e.target.checked)} />
          Paid customers only
        </label>
      </div>

      <div className="card border border-horizon/40 rounded-card overflow-x-auto">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="border-b border-horizon/40 font-mono text-mono-sm text-dust/50 uppercase tracking-wider">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3 text-right">Reports</th>
              <th className="px-4 py-3 text-right">Spend</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.userId} className="border-b border-horizon/20 hover:bg-bg-3/30">
                <td className="px-4 py-3">
                  <div className="text-star">{c.name || '—'}</div>
                  <div className="font-mono text-mono-sm text-dust/50">{c.email}</div>
                </td>
                <td className="px-4 py-3">
                  <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="text-amber hover:underline font-mono">📞 {c.phone}</a>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-mono-sm ${c.paidEver ? 'text-success' : 'text-dust/60'}`}>{c.paidEver ? 'paid' : 'free'} · {c.lastPlan || '—'}</span>
                </td>
                <td className="px-4 py-3 text-right text-star tabular-nums">{c.reports}</td>
                <td className="px-4 py-3 text-right text-amber tabular-nums">{c.spendUsd ? usd(c.spendUsd) : '—'}</td>
                <td className="px-4 py-3 font-mono text-mono-sm text-dust/60">{d(c.lastActivity)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/users/${c.userId}`} className="text-amber hover:underline font-mono text-mono-sm">profile →</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-dust/60">No customers with a phone number yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
