import Link from 'next/link';
import type { Range } from '@/lib/admin2/load';
import type { Stage } from '@/lib/admin2/metrics';
import { INTERNAL_RULE_LABELS } from '@/lib/admin2/internal';

// ── formatting ──────────────────────────────────────────────────────────────

export const n = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toLocaleString('en-IN'));
export const pctTxt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v}%`);
export const inr = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `₹${Math.round(v).toLocaleString('en-IN')}`;
export const usd = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined ? '—' : `$${v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export function dur(ms: number | null): string {
  if (ms === null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 90) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

export function when(iso: string | number | null): string {
  if (iso === null) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return 'never';
  const ms = now - Date.parse(iso);
  if (ms < 60_000) return 'just now';
  return `${dur(ms)} ago`;
}

/** Small-sample guard: a % on fewer than this many is shown, but flagged. */
export const SMALL = 20;

// ── layout pieces ───────────────────────────────────────────────────────────

export function PageHead({ title, sub, range, path, slugs, sources }: {
  title: string;
  sub?: string;
  range: Range;
  path: string;
  slugs?: string[];
  sources?: string[];
}) {
  return (
    <div className="a2-head">
      <div>
        <h1 className="a2-h1">{title}</h1>
        {sub && <div className="a2-sub">{sub}</div>}
      </div>
      <Filters range={range} path={path} slugs={slugs} sources={sources} />
    </div>
  );
}

function qs(range: Range, over: Record<string, string | number | null>): string {
  const p = new URLSearchParams();
  const base: Record<string, string | number | null> = {
    days: range.days,
    slug: range.slug,
    source: range.source,
    internal: range.includeInternal ? '1' : null,
    ...over,
  };
  for (const [k, v] of Object.entries(base)) if (v !== null && v !== '' && !(k === 'days' && v === 30)) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function Filters({ range, path, slugs, sources }: { range: Range; path: string; slugs?: string[]; sources?: string[] }) {
  return (
    <div className="a2-filters">
      <div className="a2-seg" role="group" aria-label="Date range">
        {[1, 7, 30, 90].map((d) => (
          <Link key={d} href={`${path}${qs(range, { days: d })}`} aria-current={range.days === d ? 'true' : undefined}>
            {d === 1 ? '24h' : `${d}d`}
          </Link>
        ))}
      </div>
      {(slugs || sources) && (
        <form method="get" action={path} className="a2-filters">
          <input type="hidden" name="days" value={range.days} />
          {range.includeInternal && <input type="hidden" name="internal" value="1" />}
          {slugs && (
            <select name="slug" defaultValue={range.slug ?? ''} className="a2-select" aria-label="Funnel slug">
              <option value="">All funnels</option>
              {Array.from(new Set([...(range.slug ? [range.slug] : []), ...slugs])).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          {sources && (
            <select name="source" defaultValue={range.source ?? ''} className="a2-select" aria-label="Source">
              <option value="">All sources</option>
              {Array.from(new Set([...(range.source ? [range.source] : []), ...sources])).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <button type="submit" className="a2-btn">Apply</button>
        </form>
      )}
      <Link
        href={`${path}${qs(range, { internal: range.includeInternal ? null : '1' })}`}
        className="a2-btn"
        title={`Internal/test traffic: ${INTERNAL_RULE_LABELS.join('; ')}`}
      >
        {range.includeInternal ? 'Internal: included' : 'Internal: excluded'}
      </Link>
    </div>
  );
}

export function Panel({ title, meta, def, children, id }: { title: string; meta?: React.ReactNode; def?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section className="a2-panel" id={id} aria-labelledby={id ? `${id}-t` : undefined}>
      <div className="a2-panel-head">
        <h2 className="a2-panel-title" id={id ? `${id}-t` : undefined}>{title}</h2>
        {meta && <span className="a2-panel-meta">{meta}</span>}
      </div>
      <div className="a2-panel-body">{children}</div>
      {def && <div className="a2-def">{def}</div>}
    </section>
  );
}

export function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="a2-note warn" role="status">
      {items.map((w) => (
        <div key={w}>{w}</div>
      ))}
    </div>
  );
}

// ── KPI tile ────────────────────────────────────────────────────────────────

export function Kpi({ label, value, curr, prev, upIsGood = true, spark, title }: {
  label: string;
  value: string;
  curr?: number;
  prev?: number;
  upIsGood?: boolean;
  spark?: number[];
  title?: string;
}) {
  let delta: React.ReactNode = <span className="a2-delta">&nbsp;</span>;
  if (curr !== undefined && prev !== undefined) {
    if (!prev && !curr) delta = <span className="a2-delta">no change</span>;
    else if (!prev) delta = <span className="a2-delta">new (0 before)</span>;
    else {
      const d = Math.round(((curr - prev) / prev) * 100);
      const good = d === 0 ? '' : (d > 0) === upIsGood ? 'good' : 'bad';
      delta = (
        <span className={`a2-delta tnum ${good}`} title={`Previous period: ${prev.toLocaleString('en-IN')}`}>
          {d > 0 ? '+' : ''}
          {d}% vs prev.
        </span>
      );
    }
  }
  return (
    <div className="a2-kpi" title={title}>
      <div className="a2-kpi-label">{label}</div>
      <div className="a2-kpi-value tnum">{value}</div>
      <div className="a2-kpi-foot">
        {delta}
        {spark && spark.length > 1 && <Spark values={spark} />}
      </div>
    </div>
  );
}

export function Spark({ values, w = 64, h = 18 }: { values: number[]; w?: number; h?: number }) {
  const max = Math.max(1, ...values);
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 1 - (v / max) * (h - 2)).toFixed(1)}`).join(' ');
  return (
    <svg className="a2-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--a2-accent)" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

// ── funnel ──────────────────────────────────────────────────────────────────

export function FunnelBars({ stages, prev }: { stages: Stage[]; prev?: Stage[] }) {
  const top = stages[0]?.count ?? 0;
  if (!top) return <p className="a2-empty">No visitors in this range with these filters.</p>;
  return (
    <div className="a2-funnel">
      {stages.map((s, i) => {
        const w = top ? (s.count / top) * 100 : 0;
        const prevW = i > 0 && top ? (stages[i - 1].count / top) * 100 : w;
        const p = prev?.[i];
        return (
          <div className="a2-frow" key={s.key}>
            <span className="a2-flabel">{s.label}</span>
            <span className="a2-fnums tnum">
              <b>{n(s.count)}</b>
              {i > 0 ? `${pctTxt(s.pctOfPrev)} of previous` : 'visitors'}
            </span>
            <div className="a2-fbar" aria-hidden="true">
              <s style={{ left: `${w}%`, width: `${Math.max(0, prevW - w)}%` }} />
              <i style={{ width: `${Math.max(w, s.count ? 0.6 : 0)}%` }} />
            </div>
            {i > 0 && (
              <span className="a2-fsub tnum">
                {pctTxt(s.pctOfFirst)} of visitors
                {s.dropped > 0 && <> · <span className="bad">{n(s.dropped)} dropped</span></>}
                {s.medianMsFromPrev !== null && <> · median {dur(s.medianMsFromPrev)} from previous step</>}
                {p && <> · prev. period {n(p.count)}</>}
                {stages[i - 1].count > 0 && stages[i - 1].count < SMALL && <> · small sample</>}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Foot({ excluded, range }: { excluded?: number; range: Range }) {
  return (
    <p className="a2-foot">
      Computed {when(range.now)} IST from live data, no caching. {range.includeInternal ? 'Internal and test traffic is INCLUDED.' : `Internal and test traffic excluded${excluded ? ` (${n(excluded)} visitors in range)` : ''}: ${INTERNAL_RULE_LABELS.join('; ')}.`}{' '}
      Money is converted to rupees at fixed planning rates (US$1 = ₹83, AED 1 = ₹22.6).
    </p>
  );
}
