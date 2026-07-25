'use client';

/**
 * Campaign Control Panel — every marketing asset the autonomous engine produces,
 * its live hour-by-hour performance, and the latest plain-English kill/double/
 * watch verdict. Data flows: marketing-agent loops → Supabase (marketing_assets,
 * marketing_stats, marketing_insights) → /api/admin/campaigns. The Kill button
 * writes status='killed'; the agent's sync loop propagates it down locally.
 * Follows docs/DESIGN_SYSTEM.md: serif only for headlines, DM Sans + tabular
 * numerals for every number, no mono, no uppercase, night-canvas cards.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

type SparkPoint = { t: string; views: number };
type SeriesRow = { t: string; source: string; views: number; likes: number; comments: number };

type Asset = {
  id: string;
  slug: string;
  kind: string;
  status: 'ready_to_render' | 'rendered' | 'published_manual' | 'published_auto' | 'killed';
  hook: string | null;
  language: string | null;
  script: unknown;
  hashtags: string[] | null;
  parent_slug: string | null;
  youtube_title: string | null;
  youtube_description: string | null;
  utm_campaign: string | null;
  video_path: string | null;
  youtube_video_id: string | null;
  instagram_permalink: string | null;
  render_cost_usd: number | null;
  created_at: string;
  latestViews: number | null;
  latestLikes: number | null;
  latestComments: number | null;
  latestAt: string | null;
  spark: SparkPoint[];
  series: SeriesRow[];
  sessions: number;
  signups: number;
};

type InsightAction = {
  assetSlug: string;
  action: 'kill' | 'double' | 'watch' | 'localize';
  reason: string;
  confidence?: number;
  languages?: string[];
};
type Insight = { generated_at: string; period: string | null; headline: string | null; body: string | null; actions: InsightAction[] | null };
type Totals = { views: number; sessions: number; signups: number; spendUsd: number };
type Data = { assets: Asset[]; insight: Insight | null; totals: Totals | null; migrationPending?: boolean; note?: string };

const REFRESH_MS = 15 * 60 * 1000;

const STATUS_META: Record<Asset['status'], { label: string; cls: string }> = {
  ready_to_render: { label: 'Ready to render', cls: 'bg-indigo-muted text-indigo' },
  rendered: { label: 'Rendered', cls: 'bg-bg-3 text-dust-light' },
  published_manual: { label: 'Published (manual)', cls: 'bg-success-bg text-success-light' },
  published_auto: { label: 'Published (auto)', cls: 'bg-success-bg text-success-light' },
  killed: { label: 'Killed', cls: 'bg-error-bg text-error-light' },
};

const ACTION_META: Record<InsightAction['action'], { label: string; cls: string }> = {
  kill: { label: 'Kill', cls: 'bg-error-bg text-error-light border-error/30' },
  double: { label: 'Double', cls: 'bg-success-bg text-success-light border-success/30' },
  watch: { label: 'Watch', cls: 'bg-indigo-muted text-indigo border-indigo/30' },
  localize: { label: 'Localize', cls: 'bg-amber-muted text-amber-light border-amber/30' },
};

const num = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));

function ago(iso: string | null): string {
  if (!iso) return '—';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function Sparkline({ points }: { points: SparkPoint[] }) {
  if (points.length < 2) {
    return <span className="text-body-sm text-dust">not enough data</span>;
  }
  const w = 104;
  const h = 28;
  const vs = points.map((p) => p.views);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const span = Math.max(1, max - min);
  const pts = points
    .map((p, i) => `${((i / (points.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((p.views - min) / span) * (h - 6)).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-amber" aria-label="Views over the last 48 hours" role="img">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="rounded-button border border-horizon px-2.5 py-1 text-body-sm text-dust-light hover:text-star hover:border-indigo/50 transition-colors"
    >
      {copied ? 'Copied' : `Copy ${label}`}
    </button>
  );
}

export default function CampaignControlPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [killing, setKilling] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/campaigns', { cache: 'no-store' });
      const j = (await res.json()) as Data & { error?: string };
      if (j.error) setErr(j.error);
      else {
        setData(j);
        setErr(null);
        setUpdatedAt(new Date());
      }
    } catch {
      setErr('Failed to load campaign data.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, REFRESH_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const kill = async (slug: string) => {
    const variantCount = (data?.assets ?? []).filter((x) => x.parent_slug === slug).length;
    const scope = variantCount > 0 ? ` and its ${variantCount} language variant${variantCount > 1 ? 's' : ''}` : '';
    if (!window.confirm(`Kill "${slug}"${scope}? The engine stops rendering and publishing it. This is a one-way switch.`)) return;
    setKilling(slug);
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, action: 'kill' }),
      });
      const j = await res.json();
      if (j.error) setErr(j.error);
      else await load();
    } finally {
      setKilling(null);
    }
  };

  // ── Error state ──
  if (err && !data) {
    return (
      <div className="rounded-card bg-nebula shadow-card p-6 space-y-3">
        <h1 className="font-display text-headline-lg text-star">Campaign control panel</h1>
        <p className="text-body-md text-error-light">{err}</p>
        <button onClick={load} className="rounded-button border border-horizon px-4 py-2 text-body-sm text-dust-light hover:text-star transition-colors">
          Try again
        </button>
      </div>
    );
  }

  // ── Skeleton ──
  if (!data) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading campaigns">
        <div className="h-8 w-72 rounded-card bg-bg-3 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-card bg-nebula animate-pulse" />
          ))}
        </div>
        <div className="h-32 rounded-card bg-nebula animate-pulse" />
        <div className="h-64 rounded-card bg-nebula animate-pulse" />
      </div>
    );
  }

  const assets = data.assets ?? [];
  const insight = data.insight;
  const actions = (insight?.actions ?? []) as InsightAction[];

  // Language variants (dubbed hi/ta/te/... reels) group under their original.
  const slugSet = new Set(assets.map((a) => a.slug));
  const childrenOf = new Map<string, Asset[]>();
  const topLevel: Asset[] = [];
  for (const a of assets) {
    if (a.parent_slug && slugSet.has(a.parent_slug)) {
      const arr = childrenOf.get(a.parent_slug) ?? [];
      arr.push(a);
      childrenOf.set(a.parent_slug, arr);
    } else {
      topLevel.push(a);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-display-md text-star">Campaign control panel</h1>
          <p className="mt-1 text-body-sm text-dust">
            Every asset the marketing engine produces, refreshed automatically every 15 minutes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-body-sm text-dust tabular-nums">
            {updatedAt ? `Updated ${updatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
          </span>
          <button
            onClick={load}
            disabled={refreshing}
            className="rounded-button border border-horizon px-4 py-2 text-body-sm text-dust-light hover:text-star hover:border-indigo/50 transition-colors disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {err && <p className="text-body-sm text-error-light">{err}</p>}

      {data.migrationPending && (
        <div className="rounded-card bg-nebula shadow-card border border-amber/30 p-5">
          <p className="text-body-md text-star">One setup step left</p>
          <p className="mt-1 text-body-sm text-dust-light">{data.note}</p>
        </div>
      )}

      {/* KPI header */}
      {data.totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              ['Total views', num(data.totals.views)],
              ['Sessions attributed', num(data.totals.sessions)],
              ['Signups attributed', num(data.totals.signups)],
              ['Spend', `$${data.totals.spendUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="rounded-card bg-nebula shadow-card p-5">
              <div className="text-body-sm text-dust">{label}</div>
              <div className="mt-1 text-2xl font-semibold text-star tabular-nums">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Latest insight hero */}
      {insight ? (
        <div className="rounded-card bg-nebula shadow-card p-6 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-headline-lg text-star">{insight.headline ?? 'Latest read on your campaigns'}</h2>
            <span className="text-body-sm text-dust tabular-nums">{ago(insight.generated_at)}</span>
          </div>
          {insight.body && <p className="max-w-reading text-body-md text-dust-light">{insight.body}</p>}
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((a, i) => (
                <div key={`${a.assetSlug}-${i}`} className={`rounded-pill border px-3 py-1.5 text-body-sm ${ACTION_META[a.action]?.cls ?? ACTION_META.watch.cls}`}>
                  <span className="font-semibold">{ACTION_META[a.action]?.label ?? 'Watch'}</span>
                  <span className="mx-1.5">·</span>
                  <span>{a.assetSlug}</span>
                  {a.action === 'localize' && a.languages?.length ? <span className="ml-1.5">→ {a.languages.join(', ')}</span> : null}
                  {a.reason && <span className="ml-1.5">— {a.reason}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        !data.migrationPending && (
          <div className="rounded-card bg-nebula shadow-card p-6">
            <p className="text-body-md text-dust-light">No insight yet — the insights loop writes one every couple of hours once assets have live stats.</p>
          </div>
        )
      )}

      {/* Asset table */}
      <div className="rounded-card bg-nebula shadow-card overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_repeat(5,minmax(0,1fr))_auto] gap-3 border-b border-horizon px-5 py-3 text-body-sm text-dust">
          <span>Asset</span>
          <span>Status</span>
          <span className="text-right">Views</span>
          <span>Trend (48h)</span>
          <span className="text-right">Sessions · Signups</span>
          <span className="text-right">Cost</span>
          <span className="text-right">Action</span>
        </div>

        {assets.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="font-display text-headline-md text-star">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-reading text-body-sm text-dust-light">
              Assets appear here as the engine produces them: the creative loop writes scripts, the render loop turns them into
              reels, and the sync loop mirrors everything up every 30 minutes.
            </p>
          </div>
        )}

        {topLevel.map((parent) => {
          const kids = childrenOf.get(parent.slug) ?? [];
          return (
            <div key={parent.slug} className="border-b border-horizon/50 last:border-b-0">
              {[parent, ...kids].map((a) => {
                const depth = a.slug === parent.slug ? 0 : 1;
                const open = openSlug === a.slug;
                const publishedWhere = [
                  a.youtube_video_id ? 'YouTube' : null,
                  a.instagram_permalink ? 'Instagram' : null,
                ].filter(Boolean).join(' · ');
                return (
                  <div key={a.slug} className={depth ? 'border-t border-horizon/30 bg-bg-3/20' : ''}>
              <div className="grid grid-cols-2 md:grid-cols-[minmax(0,2.2fr)_repeat(5,minmax(0,1fr))_auto] items-center gap-3 px-5 py-4">
                <button onClick={() => setOpenSlug(open ? null : a.slug)} className={`col-span-2 md:col-span-1 text-left group ${depth ? 'pl-5 md:pl-7' : ''}`}>
                  <span className="block text-body-md text-star group-hover:text-amber-light transition-colors">
                    {depth > 0 && (
                      <span className="mr-2 inline-block rounded-pill bg-indigo-muted px-2 py-0.5 text-body-sm text-indigo align-middle">
                        {a.language || 'variant'}
                      </span>
                    )}
                    {a.hook || a.youtube_title || a.slug}
                  </span>
                  <span className="block text-body-sm text-dust">
                    {a.slug} · {a.kind}{a.language ? ` · ${a.language}` : ''} · {ago(a.created_at)}
                    {publishedWhere ? ` · ${publishedWhere}` : ''}
                    {depth === 0 && kids.length > 0 ? ` · ${kids.length} language variant${kids.length > 1 ? 's' : ''}` : ''}
                  </span>
                </button>
                <div>
                  <span className={`inline-block rounded-pill px-2.5 py-1 text-body-sm ${STATUS_META[a.status]?.cls ?? STATUS_META.rendered.cls}`}>
                    {STATUS_META[a.status]?.label ?? a.status}
                  </span>
                </div>
                <div className="text-right text-body-md text-star tabular-nums">
                  {num(a.latestViews)}
                  {a.latestAt && <span className="block text-body-sm text-dust">{ago(a.latestAt)}</span>}
                </div>
                <div><Sparkline points={a.spark} /></div>
                <div className="text-right text-body-md text-dust-light tabular-nums">
                  {num(a.sessions)} · {num(a.signups)}
                </div>
                <div className="text-right text-body-md text-dust-light tabular-nums">
                  {a.render_cost_usd != null ? `$${Number(a.render_cost_usd).toFixed(2)}` : '—'}
                </div>
                <div className="text-right">
                  {a.status !== 'killed' ? (
                    <button
                      onClick={() => kill(a.slug)}
                      disabled={killing === a.slug}
                      className="rounded-button border border-error/40 px-3 py-1.5 text-body-sm text-error-light hover:bg-error-bg transition-colors disabled:opacity-50"
                    >
                      {killing === a.slug ? 'Killing…' : 'Kill'}
                    </button>
                  ) : (
                    <span className="text-body-sm text-dust">—</span>
                  )}
                </div>
              </div>

              {open && (
                <div className="grid gap-5 border-t border-horizon/50 bg-bg-3/40 px-5 py-5 lg:grid-cols-2">
                  {/* Publish packet — 30-second manual Instagram posting */}
                  <div className="space-y-3">
                    <h3 className="font-display text-headline-md text-star">Publish packet</h3>
                    {a.youtube_title && <p className="text-body-md text-star">{a.youtube_title}</p>}
                    {a.youtube_description && (
                      <p className="max-w-reading whitespace-pre-wrap text-body-sm text-dust-light">{a.youtube_description}</p>
                    )}
                    {Array.isArray(a.hashtags) && a.hashtags.length > 0 && (
                      <p className="text-body-sm text-indigo">{a.hashtags.join(' ')}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {a.youtube_title && <CopyButton label="title" value={a.youtube_title} />}
                      {a.youtube_description && <CopyButton label="description" value={a.youtube_description} />}
                      {Array.isArray(a.hashtags) && a.hashtags.length > 0 && (
                        <CopyButton label="hashtags" value={a.hashtags.join(' ')} />
                      )}
                      {a.utm_campaign && <CopyButton label="campaign tag" value={a.utm_campaign} />}
                    </div>
                    {a.video_path && <p className="break-all text-body-sm text-dust">Video: {a.video_path}</p>}
                    <div className="flex flex-wrap gap-3">
                      {a.youtube_video_id && (
                        <a
                          href={`https://youtu.be/${a.youtube_video_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-body-sm text-indigo hover:text-star transition-colors"
                        >
                          Watch on YouTube
                        </a>
                      )}
                      {a.instagram_permalink && (
                        <a
                          href={a.instagram_permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-body-sm text-indigo hover:text-star transition-colors"
                        >
                          View on Instagram
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Full stats time series */}
                  <div className="space-y-3">
                    <h3 className="font-display text-headline-md text-star">Stats, hour by hour</h3>
                    {a.series.length === 0 ? (
                      <p className="text-body-sm text-dust-light">
                        No stats captured yet — the stats loop polls hourly once this asset has a YouTube video id (or a
                        manual_stats.json entry).
                      </p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto rounded-card border border-horizon/50">
                        <table className="w-full text-left text-body-sm">
                          <thead className="sticky top-0 bg-nebula text-dust">
                            <tr>
                              <th className="px-3 py-2 font-medium">Captured</th>
                              <th className="px-3 py-2 font-medium">Source</th>
                              <th className="px-3 py-2 text-right font-medium">Views</th>
                              <th className="px-3 py-2 text-right font-medium">Likes</th>
                              <th className="px-3 py-2 text-right font-medium">Comments</th>
                            </tr>
                          </thead>
                          <tbody>
                            {a.series.slice().reverse().map((s, i) => (
                              <tr key={i} className="border-t border-horizon/40">
                                <td className="px-3 py-1.5 text-dust-light tabular-nums">
                                  {new Date(s.t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </td>
                                <td className="px-3 py-1.5 text-dust">{s.source}</td>
                                <td className="px-3 py-1.5 text-right text-star tabular-nums">{num(s.views)}</td>
                                <td className="px-3 py-1.5 text-right text-dust-light tabular-nums">{num(s.likes)}</td>
                                <td className="px-3 py-1.5 text-right text-dust-light tabular-nums">{num(s.comments)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
