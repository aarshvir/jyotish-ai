'use client';

import { useEffect, useState } from 'react';

type Row = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  sessions: number;
  signups: number;
  payers: number;
  revenueUsdCents: number;
  convPct: number | null;
  revenuePerSignupUsdCents: number | null;
};
type Kpis = {
  revenueUsdCents: number;
  payers: number;
  purchases: number;
  arppUsdCents: number | null;
  paidConversionPct: number | null;
  revenuePerSignupUsdCents: number | null;
};
type Data = { rows: Row[]; kpis: Kpis | null; totalProfiles: number; range: { days: number }; note: string };

const RANGES = [7, 30, 90];
const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

type SortKey = 'source' | 'sessions' | 'signups' | 'payers' | 'revenueUsdCents' | 'convPct' | 'revenuePerSignupUsdCents';

export default function CampaignsPage() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'revenueUsdCents', dir: -1 });

  useEffect(() => {
    setD(null);
    fetch(`/api/admin/campaigns?days=${days}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setD(j)))
      .catch(() => setErr('Failed to load'));
  }, [days]);

  if (err) return <p className="text-caution">{err}</p>;
  if (!d) return <p className="text-dust">Loading…</p>;

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === -1 ? 1 : -1 } : { key, dir: -1 }));

  const rows = d.rows.slice().sort((a, b) => {
    if (sort.key === 'source') {
      const av = `${a.source ?? ''} ${a.medium ?? ''} ${a.campaign ?? ''}`;
      const bv = `${b.source ?? ''} ${b.medium ?? ''} ${b.campaign ?? ''}`;
      return av.localeCompare(bv) * sort.dir;
    }
    const av = (a[sort.key] ?? -1) as number;
    const bv = (b[sort.key] ?? -1) as number;
    return (av - bv) * sort.dir;
  });
  const maxRev = Math.max(...d.rows.map((r) => r.revenueUsdCents), 1);

  const Th = ({ k, label, right = true }: { k: SortKey; label: string; right?: boolean }) => (
    <th className={`px-4 py-3 ${right ? 'text-right' : ''}`}>
      <button onClick={() => toggleSort(k)} className="hover:text-star transition-colors uppercase tracking-wider">
        {label}{sort.key === k ? (sort.dir === -1 ? ' ▼' : ' ▲') : ''}
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-star">Campaigns <span className="font-mono text-mono-sm text-dust/40">(UTM → signups → revenue)</span></h1>
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

      {d.kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ['Revenue (all-time)', usd(d.kpis.revenueUsdCents)],
            ['Payers', d.kpis.payers.toLocaleString()],
            ['ARPPU', d.kpis.arppUsdCents != null ? usd(d.kpis.arppUsdCents) : '—'],
            ['Revenue / signup', d.kpis.revenuePerSignupUsdCents != null ? usd(d.kpis.revenuePerSignupUsdCents) : '—'],
            ['Paid conv.', d.kpis.paidConversionPct != null ? `${d.kpis.paidConversionPct}%` : '—'],
          ].map(([l, v]) => (
            <div key={l} className="card border border-horizon/40 rounded-card p-5">
              <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">{l}</div>
              <div className="font-display text-2xl text-amber mt-1">{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card border border-horizon/40 rounded-card overflow-x-auto">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="border-b border-horizon/40 font-mono text-mono-sm text-dust/50">
              <Th k="source" label="Source / Medium / Campaign" right={false} />
              <Th k="sessions" label={`Sessions (${d.range.days}d)`} />
              <Th k="signups" label="Signups" />
              <Th k="payers" label="Payers" />
              <Th k="convPct" label="Conv." />
              <Th k="revenueUsdCents" label="Revenue" />
              <Th k="revenuePerSignupUsdCents" label="Rev / signup" />
              <th className="px-4 py-3 w-32 uppercase tracking-wider">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const key = `${r.source ?? '(direct)'}|${r.medium ?? '-'}|${r.campaign ?? '-'}`;
              return (
                <tr key={key} className="border-b border-horizon/20 hover:bg-bg-3/30">
                  <td className="px-4 py-3">
                    <span className="text-star">{r.source ?? '(direct)'}</span>
                    <span className="text-dust/50 font-mono text-mono-sm"> · {r.medium ?? '—'}{r.campaign ? ` · ${r.campaign}` : ''}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-dust">{r.sessions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-dust">{r.signups}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-star">{r.payers}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-dust">{r.convPct != null ? `${r.convPct}%` : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber">{usd(r.revenueUsdCents)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-dust">{r.revenuePerSignupUsdCents != null ? usd(r.revenuePerSignupUsdCents) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="h-2 rounded-full bg-bg-3/40 overflow-hidden"><div className="h-full bg-amber/70 rounded-full" style={{ width: `${(r.revenueUsdCents / maxRev) * 100}%` }} /></div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-dust/60">No campaign data yet — tag links with utm_source / utm_medium / utm_campaign.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-mono-sm text-dust/40">{d.note}</p>
    </div>
  );
}
