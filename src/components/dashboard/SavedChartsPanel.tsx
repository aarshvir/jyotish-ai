'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import type { UserChartsResponse } from '@/app/api/user/charts/route';
import { mergeSavedCharts } from './savedCharts';

function dateLabel(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SavedChartLists({ charts, transportError = false }: { charts: UserChartsResponse | null; transportError?: boolean }) {
  const kundaliUnavailable = transportError || charts?.unavailable.kundali;
  const synastryUnavailable = transportError || charts?.unavailable.synastry;
  const errorText = (hasItems: boolean) => hasItems ? 'Could not refresh this collection. Showing records from the last successful load; retry to check for changes.' : 'Could not retrieve this collection. This does not mean your saved records were deleted. Retry loading.';
  return <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
    <section><h3 className="mb-3 text-base font-medium">Kundli readings</h3>
      {kundaliUnavailable && <p role="alert" className="mb-3 text-sm leading-relaxed text-dust">{errorText(Boolean(charts?.kundali.length))}</p>}
      {charts?.kundali.length ? <ul className="space-y-2">{charts.kundali.map(chart => <li key={chart.id}><Link href={`/kundali/${chart.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md py-2 text-sm text-star hover:text-amber focus-visible:ring-2 focus-visible:ring-amber"><span className="min-w-0 break-words font-medium">{chart.name}</span><time dateTime={chart.created_at} className="text-xs text-dust">{dateLabel(chart.created_at)}</time></Link></li>)}</ul> : charts && !kundaliUnavailable ? <p className="text-sm text-dust">No saved Kundli readings found in this account.</p> : !kundaliUnavailable ? <p role="status" className="text-sm text-dust">Loading saved Kundli readings...</p> : null}
      {charts && charts.kundali.length >= 50 && <p className="mt-2 text-xs text-dust">Showing the 50 most recent readings. Contact support for older records.</p>}
    </section>
    <section><h3 className="mb-3 text-base font-medium">Match reports</h3>
      {synastryUnavailable && <p role="alert" className="mb-3 text-sm leading-relaxed text-dust">{errorText(Boolean(charts?.synastry.length))}</p>}
      {charts?.synastry.length ? <ul className="space-y-2">{charts.synastry.map(chart => <li key={chart.id}><Link href={`/synastry/${chart.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md py-2 text-sm text-star hover:text-amber focus-visible:ring-2 focus-visible:ring-amber"><span className="min-w-0 break-words font-medium">{chart.partnerA} &amp; {chart.partnerB}</span><span className="text-xs text-dust">{chart.score != null && `${chart.score}/36 - `}<time dateTime={chart.created_at}>{dateLabel(chart.created_at)}</time></span></Link></li>)}</ul> : charts && !synastryUnavailable ? <p className="text-sm text-dust">No saved matches found in this account.</p> : !synastryUnavailable ? <p role="status" className="text-sm text-dust">Loading saved matches...</p> : null}
      {charts && charts.synastry.length >= 50 && <p className="mt-2 text-xs text-dust">Showing the 50 most recent matches. Contact support for older records.</p>}
    </section>
  </div>;
}

export function SavedChartsPanel() {
  const [charts, setCharts] = useState<UserChartsResponse | null>(null);
  const [transportError, setTransportError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    setLoading(true);
    setTransportError(false);
    void (async () => {
      try {
        const res = await fetch('/api/user/charts', { credentials: 'include', cache: 'no-store', signal: controller.signal });
        if (!res.ok) throw new Error('Chart retrieval unavailable');
        const json = await res.json() as UserChartsResponse;
        if (!Array.isArray(json.kundali) || !Array.isArray(json.synastry) || typeof json.unavailable?.kundali !== 'boolean' || typeof json.unavailable?.synastry !== 'boolean') throw new Error('Invalid chart response');
        if (!cancelled) setCharts(previous => mergeSavedCharts(previous, json));
      } catch {
        if (!cancelled) setTransportError(true);
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [attempt]);

  return <section className="border-y border-horizon py-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Saved Kundli readings &amp; matches</h2><button type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)} className="inline-flex min-h-11 items-center gap-2 text-sm text-amber focus-visible:ring-2 focus-visible:ring-amber disabled:opacity-60"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} />{loading ? 'Loading saved charts...' : transportError || charts?.unavailable.kundali || charts?.unavailable.synastry ? 'Retry loading charts' : 'Refresh saved charts'}</button></div>
    <SavedChartLists charts={charts} transportError={transportError} />
    <Link href="/help/existing-reports" className="mt-4 inline-flex min-h-11 items-center text-sm text-amber">Missing an existing report?</Link>
  </section>;
}
