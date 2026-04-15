'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NowResponse } from '@/lib/api/nowTypes';

interface RightNowCardProps {
  className?: string;
}

function localClockFromOffset(offsetMinutes: number): { h: number; m: number } {
  const d = new Date();
  let total = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + offsetMinutes;
  total = ((total % 1440) + 1440) % 1440;
  return { h: Math.floor(total / 60) % 24, m: Math.floor(total % 60) };
}

function scoreBarClass(score: number, rahu: boolean): string {
  if (rahu) return 'bg-caution';
  if (score >= 80) return 'bg-success';
  if (score >= 65) return 'bg-sky-400';
  if (score >= 50) return 'bg-dust';
  if (score >= 35) return 'bg-amber';
  return 'bg-caution';
}

function formatEtaMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  return `${h}h ${r}m`;
}

async function fetchNow(): Promise<
  | { ok: true; data: NowResponse }
  | { ok: false; status: number; retry: number; error?: string }
> {
  const res = await fetch('/api/now', { credentials: 'include', cache: 'no-store' });
  if (res.status === 503) {
    const j = (await res.json().catch(() => ({}))) as { retry_after?: number };
    return { ok: false, status: 503, retry: typeof j.retry_after === 'number' ? j.retry_after : 30 };
  }
  if (res.status === 404) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, status: 404, retry: 0, error: j.error ?? 'No saved chart found.' };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, retry: 0, error: 'Could not load live score.' };
  }
  const data = (await res.json()) as NowResponse;
  return { ok: true, data };
}

export function RightNowCard({ className = '' }: RightNowCardProps) {
  const [data, setData] = useState<NowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unavailable, setUnavailable] = useState<{ retry: number } | null>(null);
  const [fatalMessage, setFatalMessage] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [tick, setTick] = useState(0);
  const fetchStartedOnce = useRef(false);

  const applyResult = useCallback((r: Awaited<ReturnType<typeof fetchNow>>) => {
    if (r.ok) { setUnavailable(null); setFatalMessage(null); setData(r.data); setFetchedAt(Date.now()); return; }
    if (r.status === 503) { setFatalMessage(null); setUnavailable({ retry: r.retry }); setData(null); return; }
    setUnavailable(null); setData(null); setFatalMessage(r.error ?? 'Could not load live score.');
  }, []);

  const load = useCallback(async (isManual: boolean) => {
    if (isManual) setRefreshing(true);
    else if (!fetchStartedOnce.current) setLoading(true);
    const r = await fetchNow();
    applyResult(r);
    fetchStartedOnce.current = true;
    setLoading(false);
    setRefreshing(false);
  }, [applyResult]);

  useEffect(() => { void load(false); }, [load]);
  useEffect(() => { const id = window.setInterval(() => void load(false), 5 * 60 * 1000); return () => window.clearInterval(id); }, [load]);
  useEffect(() => { const id = window.setInterval(() => setTick((t) => t + 1), 60_000); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    if (!unavailable || unavailable.retry <= 0) return;
    const t = window.setTimeout(() => void load(false), unavailable.retry * 1000);
    return () => window.clearTimeout(t);
  }, [unavailable, load]);

  const etaLive = useMemo(() => {
    if (!data?.next_peak) return null;
    const base = data.next_peak.minutes_until;
    if (!fetchedAt) return base;
    const elapsed = Math.floor((Date.now() - fetchedAt) / 60_000);
    return Math.max(0, base - elapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, fetchedAt, tick]);

  const rahuPulse = Boolean(data?.current.is_rahu_kaal) || Boolean(data?.rahu_kaal.is_active_now);

  if (loading && !data) {
    return (
      <div className={`w-full max-w-xl mx-auto card p-5 sm:p-6 ${className}`}>
        <div className="h-4 w-32 skeleton rounded mb-5" />
        <div className="h-10 w-20 skeleton rounded mb-4" />
        <div className="h-2 w-full skeleton rounded mb-5" />
        <div className="h-14 w-full skeleton rounded" />
      </div>
    );
  }

  if (fatalMessage && !data) {
    return (
      <div className={`w-full max-w-xl mx-auto card p-5 sm:p-6 text-dust text-body-sm ${className}`}>
        <p className="section-eyebrow mb-2">Right now</p>
        <p>{fatalMessage}</p>
      </div>
    );
  }

  if (unavailable && !data) {
    return (
      <div className={`w-full max-w-xl mx-auto card p-5 sm:p-6 text-dust text-body-sm ${className}`}>
        <p className="section-eyebrow mb-2">Right now</p>
        <p>Score temporarily unavailable — checking again in {unavailable.retry}s</p>
      </div>
    );
  }

  if (!data) return null;

  const off = data.timezone_offset_minutes;
  const { h, m } = localClockFromOffset(off);
  const clock = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const sc = data.current.score;
  const barPct = Math.min(100, Math.max(0, sc));

  return (
    <div
      className={`w-full max-w-xl mx-auto card backdrop-blur-sm p-5 sm:p-6 transition-shadow ${
        rahuPulse ? 'border-caution/60 shadow-glow-caution' : ''
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="section-eyebrow mb-1">Right now</p>
          <p className="font-body text-headline-md text-star">
            {clock}{' '}
            <span className="text-dust font-mono text-mono-md">{data.timezone_label}</span>
          </p>
        </div>
        <button
          type="button"
          aria-label="Refresh score"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-button border border-horizon/60 bg-nebula/40 text-amber hover:bg-amber/10 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px]"
        >
          <span className={refreshing ? 'animate-spin inline-block' : ''}>↻</span>
        </button>
      </div>

      {/* Score */}
      <div className="flex flex-wrap items-end gap-2.5 mb-2.5">
        <span className="text-3xl sm:text-4xl font-bold tabular-nums text-star font-mono">{sc}</span>
        <span className="text-dust text-body-md pb-1">/100</span>
      </div>
      <div className="h-2 w-full rounded-pill bg-horizon/30 overflow-hidden mb-4">
        <div
          className={`h-full rounded-pill transition-all duration-500 ${scoreBarClass(sc, rahuPulse)}`}
          style={{ width: `${barPct}%` }}
        />
      </div>

      {/* Current hora info */}
      <p className="font-mono text-mono-sm text-dust mb-3.5">
        {data.current.hora_ruler} Hora · {data.current.choghadiya} Choghadiya · {data.current.transit_lagna}
      </p>

      {/* Action directive */}
      <p className="font-body text-body-md text-star/90 leading-relaxed italic border-l-2 border-amber/30 pl-3 mb-5">
        &ldquo;{data.current.action_directive}&rdquo;
      </p>

      {/* Details */}
      <div className="border-t border-horizon/30 pt-4 space-y-3.5">
        {data.next_peak ? (
          <div>
            <p className="font-mono text-label-sm text-dust uppercase tracking-wider mb-1">Next peak</p>
            <p className="text-body-md text-star">
              <span className="text-amber mr-1">⏭</span>
              {data.next_peak.time_range}{' '}
              <span className="text-dust">({data.next_peak.score})</span>
              {etaLive != null && <span className="text-dust"> — in {formatEtaMinutes(etaLive)}</span>}
            </p>
            <p className="font-mono text-mono-sm text-dust mt-0.5">
              {data.next_peak.hora_ruler} + {data.next_peak.choghadiya} + {data.next_peak.transit_summary}
            </p>
          </div>
        ) : (
          <p className="text-body-sm text-dust">No higher-scoring window ahead today.</p>
        )}

        <div>
          <p className="font-mono text-label-sm text-dust uppercase tracking-wider mb-1">Rahu Kaal</p>
          <p className={`text-body-md ${rahuPulse ? 'text-caution font-medium' : 'text-dust'}`}>
            <span className="mr-1">⚠</span>
            {data.rahu_kaal.start}–{data.rahu_kaal.end}
          </p>
        </div>
      </div>

      {/* Day summary */}
      <div className="border-t border-horizon/30 mt-4 pt-4">
        <p className="font-body text-title-lg text-star mb-1.5">
          TODAY: {data.day.score}{' '}
          <span className="whitespace-nowrap">{data.day.emoji} {data.day.label}</span>
        </p>
        <p className="font-mono text-mono-sm text-dust leading-relaxed">
          {[data.day.yoga && `${data.day.yoga} Yoga`, data.day.nakshatra, data.day.tithi, data.day.moon_sign && `Moon ${data.day.moon_sign}`]
            .filter(Boolean).join(' · ') || '—'}
        </p>
      </div>
    </div>
  );
}
