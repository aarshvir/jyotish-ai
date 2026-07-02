'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CampaignRow = {
  campaign: string; sessions: number; pageViews: number; clicks: number; signups: number;
  reports: number; paid: number; revenue: string; convPct: number;
};
type BlogRow = { path: string; views: number; sessions: number; ctaClicks: number; signups: number };
type FunnelStep = { key: string; label: string; count: number };
type RateRow = { key: string; sessions: number; signups: number; ratePct: number };
type HourRow = { hour: number; sessions: number; signups: number };
type Side = { sessions: number; signups: number; ratePct: number };

type Data = {
  range: { days: number; since: string };
  totals: { sessions: number; pageViews: number; clicks: number; signups: number; reports: number; paid: number; revenue: string };
  campaigns: CampaignRow[];
  blog: BlogRow[];
  funnel: FunnelStep[];
  correlations: {
    channels: RateRow[]; channelInsight: string;
    entryPages: RateRow[]; entryInsight: string;
    hours: HourRow[]; hourInsight: string;
    blogVsDirect: { blog: Side; direct: Side };
    blogInsight: string;
  };
  note: string;
};

const RANGES = [7, 30, 90];
const TABS = [
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'blog', label: 'Blog' },
  { key: 'funnel', label: 'Funnel' },
  { key: 'correlations', label: 'Correlations' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const num = (n: number) => n.toLocaleString();

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card border border-horizon/40 rounded-card p-5">
      <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">{label}</div>
      <div className="font-display text-2xl text-amber mt-1 tabular-nums">{value}</div>
      {sub && <div className="font-mono text-mono-sm text-dust/40 mt-1">{sub}</div>}
    </div>
  );
}

function Insight({ text }: { text: string }) {
  return (
    <p className="font-body text-body-sm text-amber/90 mt-4 pt-3 border-t border-horizon/30">
      <span className="font-mono text-mono-sm text-dust/50 uppercase tracking-wider mr-2">Insight</span>
      {text}
    </p>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-8 text-center text-dust/60 text-body-sm">{children}</p>;
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading marketing data">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-card" />)}
      </div>
      <div className="skeleton h-9 w-80 rounded-button" />
      <div className="skeleton h-72 rounded-card" />
    </div>
  );
}

/* ── Tab sections ─────────────────────────────────────────────────────────── */

function CampaignsTab({ d }: { d: Data }) {
  if (!d.campaigns.length) {
    return <div className="card border border-horizon/40 rounded-card"><EmptyState>No campaign traffic yet in this window.</EmptyState></div>;
  }
  return (
    <div className="card border border-horizon/40 rounded-card overflow-x-auto">
      <table className="w-full text-left text-body-sm">
        <thead>
          <tr className="border-b border-horizon/40 font-mono text-mono-sm text-dust/50 uppercase tracking-wider">
            <th className="px-4 py-3">Campaign</th>
            <th className="px-4 py-3 text-right">Sessions</th>
            <th className="px-4 py-3 text-right">Views</th>
            <th className="px-4 py-3 text-right">Clicks</th>
            <th className="px-4 py-3 text-right">Signups</th>
            <th className="px-4 py-3 text-right">Reports</th>
            <th className="px-4 py-3 text-right">Paid</th>
            <th className="px-4 py-3 text-right">Revenue</th>
            <th className="px-4 py-3 text-right">Conv %</th>
          </tr>
        </thead>
        <tbody>
          {d.campaigns.map((c) => (
            <tr key={c.campaign} className="border-b border-horizon/20 hover:bg-nebula/30 transition-colors">
              <td className="px-4 py-3">
                {c.campaign === '(no campaign)'
                  ? <span className="text-dust">(no campaign)</span>
                  : <span className="text-star font-mono text-mono-md">{c.campaign}</span>}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-star">{num(c.sessions)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-dust/80">{num(c.pageViews)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-dust/80">{num(c.clicks)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-star">{num(c.signups)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-dust/80">{num(c.reports)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{c.paid > 0 ? <span className="text-success">{num(c.paid)}</span> : <span className="text-dust/40">0</span>}</td>
              <td className="px-4 py-3 text-right tabular-nums text-amber whitespace-nowrap">{c.revenue}</td>
              <td className="px-4 py-3 text-right tabular-nums text-star">{c.convPct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlogTab({ d }: { d: Data }) {
  if (!d.blog.length) {
    return <div className="card border border-horizon/40 rounded-card"><EmptyState>No blog views yet in this window.</EmptyState></div>;
  }
  return (
    <div className="card border border-horizon/40 rounded-card overflow-x-auto">
      <table className="w-full text-left text-body-sm">
        <thead>
          <tr className="border-b border-horizon/40 font-mono text-mono-sm text-dust/50 uppercase tracking-wider">
            <th className="px-4 py-3">Post</th>
            <th className="px-4 py-3 text-right">Views</th>
            <th className="px-4 py-3 text-right">Sessions</th>
            <th className="px-4 py-3 text-right">CTA clicks</th>
            <th className="px-4 py-3 text-right">Signups</th>
          </tr>
        </thead>
        <tbody>
          {d.blog.map((b) => (
            <tr key={b.path} className="border-b border-horizon/20 hover:bg-nebula/30 transition-colors">
              <td className="px-4 py-3 font-mono text-mono-sm max-w-[22rem]">
                <a href={b.path} target="_blank" rel="noreferrer" className="text-star hover:text-amber transition-colors truncate block">
                  {b.path.replace('/blog/', '')}
                </a>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-amber">{num(b.views)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-star">{num(b.sessions)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-dust/80">{num(b.ctaClicks)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{b.signups > 0 ? <span className="text-success">{num(b.signups)}</span> : <span className="text-dust/40">0</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-3 font-mono text-mono-sm text-dust/40 border-t border-horizon/20">
        CTA clicks = clicks on a blog page targeting /free-kundli or /pricing · Signups = sessions that read the post and signed in during this window.
      </p>
    </div>
  );
}

function FunnelTab({ d }: { d: Data }) {
  const top = d.funnel[0]?.count ?? 0;
  if (!top) {
    return <div className="card border border-horizon/40 rounded-card"><EmptyState>No sessions yet in this window.</EmptyState></div>;
  }
  // Worst step-to-step drop gets the caution highlight.
  let worst = -1, worstPct = 101;
  for (let i = 1; i < d.funnel.length; i++) {
    const prev = d.funnel[i - 1].count;
    if (!prev) continue;
    const sp = Math.round((d.funnel[i].count / prev) * 100);
    if (sp < worstPct) { worstPct = sp; worst = i; }
  }
  return (
    <div className="card border border-horizon/40 rounded-card p-5">
      <h2 className="font-display text-xl text-star mb-1">Session funnel</h2>
      <p className="font-mono text-mono-sm text-dust/40 mb-6">Each step counts sessions in this window that reached it.</p>
      <div className="space-y-5">
        {d.funnel.map((s, i) => {
          const pctOfTop = top ? Math.round((s.count / top) * 100) : 0;
          const prev = i > 0 ? d.funnel[i - 1].count : s.count;
          const stepPct = prev ? Math.round((s.count / prev) * 100) : 0;
          const isWorst = i === worst;
          return (
            <div key={s.key}>
              <div className="flex justify-between items-baseline font-body text-body-sm mb-1.5">
                <span className="text-star">{s.label}</span>
                <span className="tabular-nums">
                  <span className="text-amber font-display text-lg">{num(s.count)}</span>
                  <span className="text-dust/40 font-mono text-mono-sm"> · {pctOfTop}% of sessions</span>
                  {i > 0 && (
                    <span className={`font-mono text-mono-sm ${isWorst ? 'text-caution' : 'text-dust/50'}`}>
                      {' '}· {stepPct}% step{isWorst ? ' ⚠ biggest drop' : ''}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-4 rounded-full bg-nebula/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-350 ease-out-expo ${isWorst ? 'bg-caution/70' : 'bg-amber/70'}`}
                  style={{ width: `${Math.max(pctOfTop, s.count > 0 ? 2 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="font-mono text-mono-sm text-dust/40 mt-6">
        Identified sessions appear in <Link href="/admin/journeys" className="text-amber hover:underline">visitor journeys</Link>; paid users in <Link href="/admin/users" className="text-amber hover:underline">users</Link>.
      </p>
    </div>
  );
}

function RateTable({ rows, keyLabel }: { rows: RateRow[]; keyLabel: string }) {
  const max = Math.max(...rows.map((r) => r.ratePct), 1);
  if (!rows.length) return <EmptyState>No data yet in this window.</EmptyState>;
  return (
    <div className="space-y-3">
      <div className="flex justify-between font-mono text-mono-sm text-dust/50 uppercase tracking-wider">
        <span>{keyLabel}</span><span>Sessions → signups</span>
      </div>
      {rows.map((r) => (
        <div key={r.key}>
          <div className="flex justify-between font-body text-body-sm mb-1">
            <span className="text-star truncate pr-2">{r.key}</span>
            <span className="shrink-0 tabular-nums">
              <span className="text-dust/60">{num(r.sessions)} → {num(r.signups)}</span>
              <span className="text-amber"> · {r.ratePct}%</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-nebula/60 overflow-hidden">
            <div className="h-full bg-amber/70 rounded-full" style={{ width: `${(r.ratePct / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function HourStrip({ hours }: { hours: HourRow[] }) {
  const max = Math.max(...hours.map((h) => h.sessions), 1);
  return (
    <div>
      <div className="flex items-end gap-[3px] h-24">
        {hours.map((h) => (
          <div key={h.hour} className="flex-1 flex flex-col justify-end h-full group relative" title={`${String(h.hour).padStart(2, '0')}:00 IST — ${h.sessions} sessions, ${h.signups} signups`}>
            <div className="w-full rounded-t-sm bg-success/80" style={{ height: `${(h.signups / max) * 100}%` }} />
            <div className="w-full rounded-t-sm bg-amber/40" style={{ height: `${((h.sessions - h.signups) / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-mono text-mono-sm text-dust/40 mt-1.5">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23 IST</span>
      </div>
      <div className="flex items-center gap-4 font-mono text-mono-sm text-dust/50 mt-2">
        <span><span className="text-amber/70">▮</span> sessions</span>
        <span><span className="text-success">▮</span> signups</span>
      </div>
    </div>
  );
}

function CompareCard({ label, side }: { label: string; side: Side }) {
  return (
    <div className="rounded-card border border-horizon/30 bg-nebula/30 p-4 flex-1">
      <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">{label}</div>
      <div className="font-display text-3xl text-amber mt-1 tabular-nums">{side.ratePct}%</div>
      <div className="font-mono text-mono-sm text-dust/50 mt-1 tabular-nums">{num(side.signups)} signups / {num(side.sessions)} sessions</div>
    </div>
  );
}

function CorrelationsTab({ d }: { d: Data }) {
  const c = d.correlations;
  if (!d.totals.sessions) {
    return <div className="card border border-horizon/40 rounded-card"><EmptyState>No sessions yet in this window.</EmptyState></div>;
  }
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-4">Channel × signup rate</h2>
        <RateTable rows={c.channels} keyLabel="Channel" />
        <Insight text={c.channelInsight} />
      </div>
      <div className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-4">Entry page × signup rate <span className="font-mono text-mono-sm text-dust/40">(top 10)</span></h2>
        <RateTable rows={c.entryPages} keyLabel="Entry page" />
        <Insight text={c.entryInsight} />
      </div>
      <div className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-4">Activity by hour <span className="font-mono text-mono-sm text-dust/40">(IST)</span></h2>
        <HourStrip hours={c.hours} />
        <Insight text={c.hourInsight} />
      </div>
      <div className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-4">Blog-first vs direct-first</h2>
        <div className="flex gap-4">
          <CompareCard label="Blog-first" side={c.blogVsDirect.blog} />
          <CompareCard label="Direct-first" side={c.blogVsDirect.direct} />
        </div>
        <Insight text={c.blogInsight} />
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function MarketingPage() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<TabKey>('campaigns');
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setD(null);
    setErr(null);
    fetch(`/api/admin/marketing/overview?days=${days}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setD(j)))
      .catch(() => setErr('Failed to load'));
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-star">Marketing</h1>
          <p className="font-mono text-mono-sm text-dust/50 mt-1">
            Campaigns, blog performance, funnel, and what actually correlates with signups — all first-party.
          </p>
        </div>
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
      {!d && !err && <Skeleton />}

      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Sessions" value={num(d.totals.sessions)} sub={`${num(d.totals.pageViews)} views · ${num(d.totals.clicks)} clicks`} />
            <StatCard label="Signed-up sessions" value={num(d.totals.signups)} sub={d.totals.sessions ? `${Math.round((d.totals.signups / d.totals.sessions) * 100)}% of sessions` : undefined} />
            <StatCard label="Reports created" value={num(d.totals.reports)} />
            <StatCard label="Revenue" value={d.totals.revenue} sub={`${num(d.totals.paid)} completed payment${d.totals.paid === 1 ? '' : 's'}`} />
          </div>

          <div className="flex items-center gap-1 rounded-button border border-horizon/40 p-1 w-fit" role="tablist" aria-label="Marketing sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`font-mono text-mono-sm px-4 py-1.5 rounded-sm transition-colors ${tab === t.key ? 'bg-amber text-space' : 'text-dust hover:text-star'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'campaigns' && <CampaignsTab d={d} />}
          {tab === 'blog' && <BlogTab d={d} />}
          {tab === 'funnel' && <FunnelTab d={d} />}
          {tab === 'correlations' && <CorrelationsTab d={d} />}

          <p className="font-mono text-mono-sm text-dust/40">
            {d.note}{' '}
            <Link href="/admin/journeys" className="text-amber hover:underline">per-session journeys →</Link>
          </p>
        </>
      )}
    </div>
  );
}
