/**
 * PERFORMANCE -> CREATIVE FEEDBACK — the half of the learning loop that was missing.
 *
 * The engine already learned from REJECTIONS (src/lessons.ts). It did not learn from RESULTS:
 * loop:stats collected views/likes into Supabase and loop:insights wrote kill/double verdicts,
 * but none of that ever reached the script writer, so the creative engine could not discover
 * which HOOK SHAPES actually perform. This module closes that gap.
 *
 *   marketing_assets (tagged at creation by src/taxonomy.ts)
 *     x marketing_stats (the hourly time series from loop:stats)
 *     -> per-asset metrics -> aggregates BY TAG -> performanceBrief()
 *     -> injected into the ideate + script prompts in src/loops/creative.ts
 *
 * THE HONESTY RULES ARE THE POINT. A confident-sounding brief built on two data points is worse
 * than no brief at all: it would collapse the engine onto one format on noise, permanently, and
 * every future reel would inherit the mistake. So:
 *   - no comparison is EVER asserted with fewer than MIN_N samples on either side;
 *   - every number is printed with its sample size;
 *   - when the evidence is thin the brief says so in those words and tells the writer to keep
 *     exploring evenly instead of guessing.
 *
 * Cost: $0. Supabase REST reads + arithmetic. No model call, no paid API.
 */

import { db } from './db/index';
import { resolveSupabase, sbGet, MissingTableError, type Sb } from './supabase';
import {
  allCombos,
  comboKey,
  durationBucket,
  normalizeTags,
  type CreativeTags,
  type DecisionDomain,
  type HookFamily,
} from './taxonomy';

/** Below this many samples on EITHER side, a comparison is noise and is never asserted. */
export const MIN_N = 3;

const DAY_MS = 24 * 3600 * 1000;

type AssetRow = {
  id: string;
  slug: string;
  status: string;
  hook: string | null;
  language: string | null;
  parent_slug: string | null;
  created_at: string;
  script?: any;
};

type TagRow = {
  id: string;
  hook_family?: string | null;
  decision_domain?: string | null;
  emotional_register?: string | null;
  duration_target_sec?: number | null;
};

type StatRow = {
  asset_id: string;
  captured_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number | null;
  watch_pct: number | null;
  source: string;
};

export interface AssetPerf {
  slug: string;
  status: string;
  language: string | null;
  tags: CreativeTags;
  /** How the tags were obtained — a column read, the stored creative payload, or defaults. */
  tagSource: 'columns' | 'payload' | 'default';
  samples: number;
  hoursOfData: number;
  peakViews: number;
  /** Views at the first observation on/after +24h from the first observation. null if too young. */
  views24h: number | null;
  engagementRate: number | null;
  /** Only where the platform actually gives it (manual/Instagram watch_pct). Never invented. */
  retentionProxy: number | null;
}

export interface TagAggregate {
  value: string;
  n: number;
  meanMetric: number;
  medianMetric: number;
  meanEngagement: number | null;
  meanRetention: number | null;
  retentionN: number;
}

export type Dimension = 'hookFamily' | 'decisionDomain' | 'emotionalRegister' | 'durationBucket';

export interface PerformanceSnapshot {
  generatedAt: string;
  /** Whether we could reach Supabase at all. */
  available: boolean;
  reason: string | null;
  assets: AssetPerf[];
  /** 'views24h' when enough assets are old enough, otherwise 'peakViews'. Named in the brief. */
  metric: 'views24h' | 'peakViews';
  byTag: Record<Dimension, TagAggregate[]>;
}

// ---------------------------------------------------------------- helpers

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const round = (n: number, dp = 1): number => Number(n.toFixed(dp));

// ---------------------------------------------------------------- fetch

/**
 * Assets + their tags. The taxonomy columns land in Supabase only once the owner applies the
 * 20260726 migration, so the tag read is a SEPARATE, failure-tolerant request: when it is not
 * there yet we recover the tags from the creative payload already stored in `script`, and say so.
 */
async function fetchAssets(sb: Sb): Promise<{ rows: AssetRow[]; tags: Map<string, TagRow>; tagColumns: boolean }> {
  const rows = (await sbGet(
    sb,
    'marketing_assets?select=id,slug,status,hook,language,parent_slug,created_at,script&status=neq.killed&limit=500',
  )) as AssetRow[];

  let tags = new Map<string, TagRow>();
  let tagColumns = true;
  try {
    const tagRows = (await sbGet(
      sb,
      'marketing_assets?select=id,hook_family,decision_domain,emotional_register,duration_target_sec&limit=500',
    )) as TagRow[];
    tags = new Map(tagRows.map((t) => [t.id, t]));
  } catch {
    tagColumns = false;
  }
  return { rows, tags, tagColumns };
}

/** Shot seconds from the stored creative payload, so a missing durationTargetSec still has a floor. */
function shotSeconds(script: any): number {
  const shots = Array.isArray(script?.shots) ? script.shots : Array.isArray(script?.shotList) ? script.shotList : [];
  return shots.reduce((n: number, s: any) => n + (Number(s?.seconds) || 0), 0);
}

function tagsFor(a: AssetRow, t: TagRow | undefined): { tags: CreativeTags; source: AssetPerf['tagSource'] } {
  const secs = shotSeconds(a.script);
  if (t && (t.hook_family || t.decision_domain || t.emotional_register)) {
    return {
      tags: normalizeTags(
        {
          hookFamily: t.hook_family,
          decisionDomain: t.decision_domain,
          emotionalRegister: t.emotional_register,
          durationTargetSec: t.duration_target_sec,
        },
        {},
        secs,
      ),
      source: 'columns',
    };
  }
  const payload = a.script?.tags ?? a.script;
  if (payload && (payload.hookFamily || payload.hook_family)) {
    return { tags: normalizeTags(payload, {}, secs), source: 'payload' };
  }
  return { tags: normalizeTags({}, {}, secs), source: 'default' };
}

// ---------------------------------------------------------------- aggregate

function perAsset(a: AssetRow, tags: CreativeTags, tagSource: AssetPerf['tagSource'], series: StatRow[]): AssetPerf {
  const sorted = series.slice().sort((x, y) => +new Date(x.captured_at) - +new Date(y.captured_at));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const hours = first && last ? Math.max(0, (+new Date(last.captured_at) - +new Date(first.captured_at)) / 3600000) : 0;
  const peakViews = sorted.reduce((m, r) => Math.max(m, Number(r.views) || 0), 0);

  // views@24h — the first observation at or after +24h from the first observation. Deliberately
  // null (not an extrapolation) when the asset simply has not been live for a day yet.
  let views24h: number | null = null;
  if (first) {
    const cutoff = +new Date(first.captured_at) + DAY_MS;
    const at = sorted.find((r) => +new Date(r.captured_at) >= cutoff);
    if (at) views24h = Number(at.views) || 0;
  }

  const lastViews = Number(last?.views) || 0;
  const engagementRate =
    lastViews > 0 ? ((Number(last?.likes) || 0) + (Number(last?.comments) || 0) + (Number(last?.shares) || 0)) / lastViews : null;

  const watch = sorted.map((r) => Number(r.watch_pct)).filter((n) => Number.isFinite(n) && n > 0);
  return {
    slug: a.slug,
    status: a.status,
    language: a.language,
    tags,
    tagSource,
    samples: sorted.length,
    hoursOfData: round(hours),
    peakViews,
    views24h,
    engagementRate: engagementRate === null ? null : round(engagementRate, 4),
    retentionProxy: watch.length ? round(mean(watch), 1) : null,
  };
}

const dimensionValue = (p: AssetPerf, d: Dimension): string =>
  d === 'durationBucket' ? durationBucket(p.tags.durationTargetSec) : String(p.tags[d]);

function aggregateDimension(assets: AssetPerf[], d: Dimension, metric: PerformanceSnapshot['metric']): TagAggregate[] {
  const groups = new Map<string, AssetPerf[]>();
  for (const p of assets) {
    const v = dimensionValue(p, d);
    groups.set(v, [...(groups.get(v) ?? []), p]);
  }
  const out: TagAggregate[] = [];
  for (const [value, xs] of groups) {
    const vals = xs.map((p) => (metric === 'views24h' ? (p.views24h ?? 0) : p.peakViews));
    const eng = xs.map((p) => p.engagementRate).filter((n): n is number => n !== null);
    const ret = xs.map((p) => p.retentionProxy).filter((n): n is number => n !== null);
    out.push({
      value,
      n: xs.length,
      meanMetric: round(mean(vals)),
      medianMetric: round(median(vals)),
      meanEngagement: eng.length ? round(mean(eng), 4) : null,
      meanRetention: ret.length ? round(mean(ret), 1) : null,
      retentionN: ret.length,
    });
  }
  return out.sort((a, b) => b.meanMetric - a.meanMetric || b.n - a.n);
}

const emptySnapshot = (reason: string | null, available: boolean): PerformanceSnapshot => ({
  generatedAt: new Date().toISOString(),
  available,
  reason,
  assets: [],
  metric: 'peakViews',
  byTag: { hookFamily: [], decisionDomain: [], emotionalRegister: [], durationBucket: [] },
});

/**
 * Pull marketing_assets + their marketing_stats time series and aggregate BY TAG.
 * Never throws — a creative run must not die because Supabase is unreachable or the
 * marketing_* tables have not been created yet.
 */
export async function aggregatePerformance(): Promise<PerformanceSnapshot> {
  let sb: Sb | null = null;
  try {
    sb = await resolveSupabase();
  } catch {
    return emptySnapshot('Supabase unreachable', false);
  }
  if (!sb) return emptySnapshot('no Supabase credentials (marketing-agent/.env or ../.env.local)', false);

  try {
    const { rows, tags, tagColumns } = await fetchAssets(sb);
    if (!rows.length) return emptySnapshot('no marketing_assets rows yet — nothing has been posted', true);

    const stats = (await sbGet(
      sb,
      'marketing_stats?select=asset_id,captured_at,views,likes,comments,shares,watch_pct,source&order=captured_at.asc&limit=20000',
    )) as StatRow[];

    const byAsset = new Map<string, StatRow[]>();
    for (const s of stats) byAsset.set(s.asset_id, [...(byAsset.get(s.asset_id) ?? []), s]);

    const assets = rows
      .map((a) => {
        const { tags: t, source } = tagsFor(a, tags.get(a.id));
        return perAsset(a, t, source, byAsset.get(a.id) ?? []);
      })
      // Only assets with at least one observation are evidence. Everything else is a plan.
      .filter((p) => p.samples > 0);

    if (!assets.length) {
      return {
        ...emptySnapshot(
          `${rows.length} asset(s) exist but none has a marketing_stats row yet — run loop:stats after publishing`,
          true,
        ),
        generatedAt: new Date().toISOString(),
      };
    }

    const with24h = assets.filter((p) => p.views24h !== null).length;
    const metric: PerformanceSnapshot['metric'] = with24h >= MIN_N * 2 ? 'views24h' : 'peakViews';

    return {
      generatedAt: new Date().toISOString(),
      available: true,
      reason: tagColumns ? null : 'taxonomy columns absent in Supabase — tags recovered from the stored creative payload (apply migration 20260726)',
      assets,
      metric,
      byTag: {
        hookFamily: aggregateDimension(assets, 'hookFamily', metric),
        decisionDomain: aggregateDimension(assets, 'decisionDomain', metric),
        emotionalRegister: aggregateDimension(assets, 'emotionalRegister', metric),
        durationBucket: aggregateDimension(assets, 'durationBucket', metric),
      },
    };
  } catch (e: any) {
    if (e instanceof MissingTableError) return emptySnapshot('marketing_* tables not created yet (RUN_IN_SUPABASE.sql pending)', false);
    return emptySnapshot(`Supabase read failed: ${String(e?.message ?? e).slice(0, 120)}`, false);
  }
}

// ---------------------------------------------------------------- the brief

const METRIC_LABEL: Record<PerformanceSnapshot['metric'], string> = {
  views24h: '24h views',
  peakViews: 'peak views',
};

const INSUFFICIENT =
  'INSUFFICIENT DATA — do not over-fit; keep exploring hook families, decision domains and registers EVENLY. ' +
  'Treat every tag combination as equally unproven and spread this batch across them rather than repeating whatever looks good.';

/** One dimension's honest paragraph: an assertion only when both sides clear MIN_N. */
function dimensionLines(name: string, rows: TagAggregate[], metric: PerformanceSnapshot['metric']): string[] {
  if (!rows.length) return [];
  const lines: string[] = [];
  const inventory = rows.map((r) => `${r.value} n=${r.n} (mean ${METRIC_LABEL[metric]} ${r.meanMetric})`).join('; ');

  const eligible = rows.filter((r) => r.n >= MIN_N);
  if (eligible.length >= 2) {
    const best = eligible[0];
    const worst = eligible[eligible.length - 1];
    if (best.value !== worst.value) {
      if (worst.meanMetric > 0) {
        const ratio = best.meanMetric / worst.meanMetric;
        lines.push(
          `${name}: ${best.value} averages ${round(ratio, 1)}x the ${METRIC_LABEL[metric]} of ${worst.value} ` +
            `(${best.meanMetric} vs ${worst.meanMetric}; n=${best.n} vs ${worst.n}).`,
        );
      } else {
        lines.push(
          `${name}: ${best.value} averages ${best.meanMetric} ${METRIC_LABEL[metric]} (n=${best.n}) while ${worst.value} averaged 0 (n=${worst.n}) — ` +
            `a gap, but not a ratio.`,
        );
      }
    }
    const ret = eligible.filter((r) => r.retentionN >= MIN_N && r.meanRetention !== null);
    if (ret.length >= 2) {
      lines.push(
        `${name} retention: ${ret[0].value} holds ${ret[0].meanRetention}% (n=${ret[0].retentionN}) vs ${ret[ret.length - 1].value} at ` +
          `${ret[ret.length - 1].meanRetention}% (n=${ret[ret.length - 1].retentionN}).`,
      );
    }
  } else {
    // Be precise about WHY nothing is asserted — "one value only" and "everything below n=3" are
    // different states, and a writer who is told the wrong one draws the wrong conclusion.
    const why =
      eligible.length === 1
        ? `only one value (${eligible[0].value}) has reached n=${MIN_N}, so there is nothing to compare it against`
        : `no value has reached n=${MIN_N} yet, so NO comparison is made`;
    lines.push(`${name}: ${why}. Observed so far — ${inventory}.`);
    return lines;
  }
  lines.push(`${name} full counts — ${inventory}.`);
  return lines;
}

/** Render a snapshot as the compact, honest text block that goes into a prompt. */
export function renderBrief(snap: PerformanceSnapshot): string {
  const head = 'PERFORMANCE EVIDENCE — what the engine has actually observed from POSTED reels';

  if (!snap.available) {
    return `${head}\nNo performance data is readable right now (${snap.reason}). ${INSUFFICIENT}`;
  }
  if (!snap.assets.length) {
    return `${head}\nNothing has been posted and measured yet (${snap.reason}). ${INSUFFICIENT}`;
  }

  const n = snap.assets.length;
  const with24h = snap.assets.filter((p) => p.views24h !== null).length;
  const withRetention = snap.assets.filter((p) => p.retentionProxy !== null).length;

  const lines: string[] = [
    `${head} — ${n} posted reel(s) with stats; ${with24h} old enough for a 24h reading; ${withRetention} with a retention figure.`,
    `Comparisons below use ${METRIC_LABEL[snap.metric]}.` + (snap.reason ? ` Note: ${snap.reason}.` : ''),
  ];

  const dims: [string, Dimension][] = [
    ['Hook family', 'hookFamily'],
    ['Decision domain', 'decisionDomain'],
    ['Emotional register', 'emotionalRegister'],
    ['Duration', 'durationBucket'],
  ];
  const body: string[] = [];
  for (const [label, d] of dims) body.push(...dimensionLines(label, snap.byTag[d], snap.metric));

  const anyAssertion = snap.byTag.hookFamily.some((r) => r.n >= MIN_N) && snap.byTag.hookFamily.filter((r) => r.n >= MIN_N).length >= 2;
  lines.push(...body);
  if (!anyAssertion) lines.push(INSUFFICIENT);
  else
    lines.push(
      `Use this as EVIDENCE, not as a rule: it is a small sample, it can reverse, and every claim above carries its n. ` +
        `Lean toward what is winning, but never abandon the under-tested combinations named in the exploration brief.`,
    );

  return lines.join('\n');
}

/** The prompt-injection entry point: aggregate + render in one call. Never throws. */
export async function performanceBrief(): Promise<string> {
  try {
    return renderBrief(await aggregatePerformance());
  } catch (e: any) {
    return `PERFORMANCE EVIDENCE — unavailable (${String(e?.message ?? e).slice(0, 100)}). ${INSUFFICIENT}`;
  }
}

// ---------------------------------------------------------------- coverage (explore/exploit)

export interface ComboCoverage {
  key: string;
  hookFamily: HookFamily;
  decisionDomain: DecisionDomain;
  /** Variants the engine has WRITTEN in this combination (local SQLite). */
  generated: number;
  /** Assets POSTED and measured in this combination. */
  posted: number;
}

/** How many variants the creative loop has already written per combination. */
function localCounts(): Map<string, number> {
  const out = new Map<string, number>();
  try {
    const rows = db()
      .prepare(
        `SELECT hook_family AS h, decision_domain AS d, COUNT(*) AS n
           FROM creative_variants
          WHERE hook_family IS NOT NULL AND decision_domain IS NOT NULL
          GROUP BY hook_family, decision_domain`,
      )
      .all() as { h: string; d: string; n: number }[];
    for (const r of rows) out.set(`${r.h}|${r.d}`, Number(r.n) || 0);
  } catch {
    /* column/table may predate this migration — coverage is then simply zero everywhere */
  }
  return out;
}

/**
 * Deterministic-per-hour shuffle key. On a cold engine EVERY combination is tied at zero, and a
 * stable sort would then hand back the same six targets (all from whichever family happens to be
 * first) on every run forever — exploration that only ever explores one corner. Seeding the
 * tiebreak with the current hour rotates ties across runs while staying deterministic within one.
 */
function tiebreak(key: string, seed: string): number {
  let h = 2166136261;
  for (const ch of `${key}|${seed}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

/**
 * Coverage of every (hookFamily x decisionDomain) combination, LEAST tested first.
 * `posted` is weighted heavily: a combination with real measured results is well-tested even if
 * few variants were written, whereas twenty unposted drafts prove nothing.
 */
export function comboCoverage(snap: PerformanceSnapshot | null, seed = new Date().toISOString().slice(0, 13)): ComboCoverage[] {
  const gen = localCounts();
  const posted = new Map<string, number>();
  for (const p of snap?.assets ?? []) {
    const k = comboKey(p.tags.hookFamily, p.tags.decisionDomain);
    posted.set(k, (posted.get(k) ?? 0) + 1);
  }
  const score = (c: { posted: number; generated: number }) => c.posted * 10 + c.generated;
  return allCombos()
    .map((c) => ({ ...c, generated: gen.get(c.key) ?? 0, posted: posted.get(c.key) ?? 0 }))
    .sort((a, b) => score(a) - score(b) || tiebreak(a.key, seed) - tiebreak(b.key, seed));
}

/**
 * The N least-tested combinations, as the explore targets named in the ideate prompt.
 * Capped at MAX_PER_FAMILY per hook family so a single batch's exploration cannot be six shades
 * of the same shape — the point of the quota is breadth, not volume.
 */
export function exploreTargets(snap: PerformanceSnapshot | null, n: number, seed?: string): ComboCoverage[] {
  const MAX_PER_FAMILY = 2;
  const perFamily = new Map<string, number>();
  const out: ComboCoverage[] = [];
  const ranked = comboCoverage(snap, seed);
  for (const c of ranked) {
    if (out.length >= n) break;
    const used = perFamily.get(c.hookFamily) ?? 0;
    if (used >= MAX_PER_FAMILY) continue;
    perFamily.set(c.hookFamily, used + 1);
    out.push(c);
  }
  // If the family cap starved the list (few families in play), backfill in coverage order.
  for (const c of ranked) {
    if (out.length >= n) break;
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

// ---------------------------------------------------------------- CLI

/**
 * `npm run perf` — print the exact brief the creative prompts receive.
 * Own entry point, so the shared src/cli.ts stays out of the way of the concurrent
 * session that also edits it (CLAUDE.md §8) — same pattern as src/lessons.ts.
 */
if (process.argv[1] && /performance\.[cm]?ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  (async () => {
    const snap = await aggregatePerformance();
    console.log(`\n${renderBrief(snap)}\n`);
    console.log(`--- raw: ${snap.assets.length} asset(s) with stats, metric "${snap.metric}", generated ${snap.generatedAt} ---`);
    for (const a of snap.assets.slice(0, 20)) {
      console.log(
        `  ${a.slug} [${a.tags.hookFamily}/${a.tags.decisionDomain}/${a.tags.emotionalRegister}/${a.tags.durationTargetSec}s via ${a.tagSource}] ` +
          `peak=${a.peakViews} 24h=${a.views24h ?? 'n/a'} eng=${a.engagementRate ?? 'n/a'} samples=${a.samples}`,
      );
    }
    const targets = exploreTargets(snap, 6);
    console.log(`\n--- least-tested combinations (explore targets) ---`);
    for (const t of targets) console.log(`  ${t.hookFamily} x ${t.decisionDomain}  (written ${t.generated}, posted ${t.posted})`);
    console.log('');
  })().catch((e) => {
    console.error(e?.stack ?? e);
    process.exit(1);
  });
}
