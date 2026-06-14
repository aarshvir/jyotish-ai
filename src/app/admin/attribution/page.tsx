'use client';

import { useEffect, useState } from 'react';

type Channel = { channel: string; signups: number; paid: number; revenueUsd: number; convPct: number };
type Data = { channels: Channel[]; totalProfiles?: number; withFirstTouch?: number; note?: string | null };

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function AttributionPage() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/admin/attribution').then((r) => r.json()).then((j) => (j.error ? setErr(j.error) : setD(j))).catch(() => setErr('Failed to load'));
  }, []);
  if (err) return <p className="text-caution">{err}</p>;
  if (!d) return <p className="text-dust">Loading…</p>;
  const maxRev = Math.max(...d.channels.map((c) => c.revenueUsd), 1);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-star">Attribution <span className="font-mono text-mono-sm text-dust/40">(first-touch → paid)</span></h1>
      {d.note && <p className="font-mono text-mono-sm text-amber/80 border border-amber/30 rounded-md px-4 py-3 bg-amber/5">{d.note}</p>}

      <div className="card border border-horizon/40 rounded-card overflow-x-auto">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="border-b border-horizon/40 font-mono text-mono-sm text-dust/50 uppercase tracking-wider">
              <th className="px-4 py-3">Channel (first touch)</th>
              <th className="px-4 py-3 text-right">Signups</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Conv.</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 w-40">Share</th>
            </tr>
          </thead>
          <tbody>
            {d.channels.map((c) => (
              <tr key={c.channel} className="border-b border-horizon/20 hover:bg-bg-3/30">
                <td className="px-4 py-3 text-star">{c.channel}</td>
                <td className="px-4 py-3 text-right tabular-nums text-dust">{c.signups}</td>
                <td className="px-4 py-3 text-right tabular-nums text-star">{c.paid}</td>
                <td className="px-4 py-3 text-right tabular-nums text-dust">{c.convPct}%</td>
                <td className="px-4 py-3 text-right tabular-nums text-amber">{usd(c.revenueUsd)}</td>
                <td className="px-4 py-3">
                  <div className="h-2 rounded-full bg-bg-3/40 overflow-hidden"><div className="h-full bg-amber/70 rounded-full" style={{ width: `${(c.revenueUsd / maxRev) * 100}%` }} /></div>
                </td>
              </tr>
            ))}
            {d.channels.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-dust/60">No attribution data yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="font-mono text-mono-sm text-dust/40">First-touch channel is captured on the visitor&apos;s first visit (UTM/referrer) and stored at signup. Use UTM links everywhere so paid customers map to the right channel.</p>
    </div>
  );
}
