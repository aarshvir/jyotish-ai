'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NowResponse } from '@/lib/api/nowTypes';

interface RightNowCardProps {
  className?: string;
}

function localClockFromOffset(offsetMinutes: number): { h: number; m: number } {
  const d = new Date();
  let total =
    d.getUTCHours() * 60 +
    d.getUTCMinutes() +
    d.getUTCSeconds() / 60 +
    offsetMinutes;
  total = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60) % 24;
  const m = Math.floor(total % 60);
  return { h, m };
}

function scoreBarClass(score: number, rahu: boolean): string {
  if (rahu) return 'bg-red-500';
  if (score >= 80) return 'bg-emerald';
  if (score >= 65) return 'bg-sky-400';
  if (score >= 50) return 'bg-slate-400';
  if (score >= 35) return 'bg-amber';
  return 'bg-rose-500';
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
  /** After first fetch attempt (success or not), avoid flashing the skeleton on polls. */
  const fetchStartedOnce = useRef(false);

  const applyResult = useCallback((r: Awaited<ReturnType<typeof fetchNow>>) => {
    if (r.ok) {
      setUnavailable(null);
      setFatalMessage(null);
      setData(r.data);
      setFetchedAt(Date.now());
      return;
    }
    if (r.status === 503) {
      setFatalMessage(null);
      setUnavailable({ retry: r.retry });
      setData(null);
      return;
    }
    setUnavailable(null);
    setData(null);
    setFatalMessage(r.error ?? 'Could not load live score.');
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

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(false), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

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

  const rahuPulse =
    Boolean(data?.current.is_rahu_kaal) || Boolean(data?.rahu_kaal.is_active_now);

  if (loading && !data) {
    return (
      <div
        className={`w-full max-w-xl mx-auto rounded-sm border border-horizon/60 bg-nebula/30 p-5 sm:p-6 animate-pulse ${className}`}
      >
        <div className="h-4 w-40 bg-horizon/40 rounded mb-6" />
        <div className="h-10 w-24 bg-horizon/40 rounded mb-4" />
        <div className="h-3 w-full bg-horizon/30 rounded mb-6" />
        <div className="h-16 w-full bg-horizon/20 rounded" />
      </div>
    );
  }

  if (fatalMessage && !data) {
    return (
      <div
        className={`w-full max-w-xl mx-auto rounded-sm border border-horizon/50 bg-nebula/20 p-5 sm:p-6 text-dust text-sm ${className}`}
      >
        <p className="font-mono text-xs uppercase tracking-wider text-dust mb-2">Right now</p>
        <p>{fatalMessage}</p>
      </div>
    );
  }

  if (unavailable && !data) {
    return (
      <div
        className={`w-full max-w-xl mx-auto rounded-sm border border-horizon/50 bg-nebula/20 p-5 sm:p-6 text-dust text-sm ${className}`}
      >
        <p className="font-mono text-xs uppercase tracking-wider text-dust mb-2">Right now</p>
        <p>Score temporarily unavailable — checking again in {unavailable.retry}s</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const off = data.timezone_offset_minutes;
  const { h, m } = localClockFromOffset(off);
  const clock = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const sc = data.current.score;
  const barPct = Math.min(100, Math.max(0, sc));

  return (
    <div
      className={`w-full max-w-xl mx-auto rounded-sm border bg-cosmos/80 backdrop-blur-sm p-5 sm:p-6 shadow-lg transition-shadow ${
        rahuPulse ? 'border-red-500/80 shadow-red-900/20 animate-pulse' : 'border-horizon/70'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-amber mb-1">
            Right now
          </p>
          <p className="font-display text-lg sm:text-xl text-star">
            {clock}{' '}
            <span className="text-dust font-mono text-sm">{data.timezone_label}</span>
          </p>
        </div>
        <button
          type="button"
          aria-label="Refresh"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-horizon/60 bg-nebula/40 text-amber hover:bg-amber/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:opacity-50"
        >
          <span className={refreshing ? 'animate-spin inline-block' : ''} title="Refresh">
            🔄
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-3">
        <span className="text-3xl sm:text-4xl font-bold tabular-nums text-star">{sc}</span>
        <span className="text-dust text-sm sm:text-base pb-1">/100</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-horizon/30 overflow-hidden mb-5">
        <div
          className={`h-full rounded-full transition-all ${scoreBarClass(sc, rahuPulse)}`}
          style={{ width: `${barPct}%` }}
        />
      </div>

      <p className="font-mono text-xs sm:text-sm text-dust mb-4">
        {data.current.hora_ruler} Hora · {data.current.choghadiya} Choghadiya · {data.current.transit_lagna}
      </p>

      <p className="font-display text-sm sm:text-base text-star/95 leading-relaxed italic border-l-2 border-amber/40 pl-3 mb-6">
        &ldquo;{data.current.action_directive}&rdquo;
      </p>

      <div className="border-t border-horizon/40 pt-5 space-y-4">
        {data.next_peak ? (
          <div>
            <p className="font-mono text-[10px] text-dust uppercase tracking-wider mb-1">Next peak</p>
            <p className="text-sm sm:text-base text-star">
              <span className="text-amber mr-1">⏭</span>
              {data.next_peak.time_range}{' '}
              <span className="text-dust">({data.next_peak.score})</span>
              {etaLive != null && (
                <span className="text-dust"> — in {formatEtaMinutes(etaLive)}</span>
              )}
            </p>
            <p className="font-mono text-xs text-dust mt-1">
              {data.next_peak.hora_ruler} + {data.next_peak.choghadiya} + {data.next_peak.transit_summary}
            </p>
          </div>
        ) : (
          <p className="text-sm text-dust">No higher-scoring window ahead today (after this slot).</p>
        )}

        <div>
          <p className="font-mono text-[10px] text-dust uppercase tracking-wider mb-1">Rahu Kaal</p>
          <p className={`text-sm sm:text-base ${rahuPulse ? 'text-red-400 font-medium' : 'text-dust'}`}>
            <span className="mr-1">⚠</span>
            {data.rahu_kaal.start}–{data.rahu_kaal.end}
          </p>
        </div>
      </div>

      <div className="border-t border-horizon/40 mt-5 pt-5">
        <p className="font-display text-base sm:text-lg text-star mb-2">
          TODAY: {data.day.score}{' '}
          <span className="whitespace-nowrap">
            {data.day.emoji} {data.day.label}
          </span>
        </p>
        <p className="font-mono text-xs sm:text-sm text-dust leading-relaxed">
          {[data.day.yoga && `${data.day.yoga} Yoga`, data.day.nakshatra, data.day.tithi, data.day.moon_sign && `Moon ${data.day.moon_sign}`]
            .filter(Boolean)
            .join(' · ') || '—'}
        </p>
      </div>
    </div>
  );
}
