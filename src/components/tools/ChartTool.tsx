'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Calculator, Pencil, Trash2 } from 'lucide-react';
import { BirthDetailsInput, type BirthDetails } from '@/components/forms/BirthDetailsInput';
import { ShareResult } from '@/components/shared/ShareResult';
import { TimingBridge } from '@/components/tools/TimingBridge';
import { track } from '@/components/analytics/PostHogProvider';
import { validateBirth, type BirthDraft } from '@/lib/tools/birth';
import { chartResultSchema, doshaLabel, type ChartResult, type Dosha } from '@/lib/tools/chart';
import { LatestRequest, requestJson, RequestTimeout } from '@/lib/tools/requests';
import { clearCalculator, readCalculator, saveCalculator } from '@/lib/tools/storage';

export type ToolView = 'manglik' | 'kaalsarp' | 'sadesati' | 'dasha' | 'nakshatra' | 'moonsign' | 'lagna' | 'fullchart';

const DEFAULT: BirthDetails = {
  name: '', birth_date: '', birth_time: '', birth_city: '', birth_lat: Number.NaN, birth_lng: Number.NaN,
  birth_city_confirmed: false,
};
const fmt = (iso: string) => iso ? iso.slice(0, 10) : '';

function minimalDraft(d: BirthDetails): BirthDraft {
  return {
    birth_date: d.birth_date, birth_time: d.birth_time, birth_time_accuracy: d.birth_time_accuracy,
    birth_city: d.birth_city, birth_lat: Number.isFinite(d.birth_lat) ? d.birth_lat : null,
    birth_lng: Number.isFinite(d.birth_lng) ? d.birth_lng : null,
  };
}

function shareTextFor(view: ToolView, res: ChartResult): string {
  const flag = view === 'manglik' ? res.doshas.manglik : view === 'kaalsarp' ? res.doshas.kaalSarpa : res.doshas.sadeSati;
  const value = ['manglik', 'kaalsarp', 'sadesati'].includes(view) ? doshaLabel(flag)
    : view === 'moonsign' ? res.moon_sign : view === 'nakshatra' ? res.moon_nakshatra
    : view === 'lagna' ? res.lagna : view === 'dasha' ? res.current_dasha?.mahadasha
    : `${res.lagna ?? 'Unavailable'} rising; Moon: ${res.moon_sign ?? 'Unavailable'}; Sade Sati: ${doshaLabel(res.doshas.sadeSati)}`;
  return `${view}: ${value ?? 'Unavailable'} (calculated ${fmt(res.calculated_at)}${res.birth_time_accuracy === 'approximate' ? ', provisional at an approximate birth time' : ''}). Free on VedicHour. Astrological interpretation is not a prediction.`;
}

export function ChartTool({ view }: { view: ToolView; ctaHref?: string; ctaLabel?: string }) {
  const [d, setD] = useState<BirthDetails>({ ...DEFAULT });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<ChartResult | null>(null);
  const [remember, setRemember] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const requests = useRef(new LatestRequest());
  const lastSaved = useRef('');
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const requestManager = requests.current;
    try {
      const saved = readCalculator(window.localStorage);
      if (saved) {
        const restored = { ...DEFAULT, ...saved.draft, birth_lat: saved.draft.birth_lat ?? Number.NaN, birth_lng: saved.draft.birth_lng ?? Number.NaN,
          birth_city_confirmed: saved.draft.birth_lat != null && saved.draft.birth_lng != null };
        setD(restored);
        setRes(saved.result);
        setRemember(true);
        lastSaved.current = JSON.stringify({ draft: minimalDraft(restored), result: saved.result });
        setFormKey(k => k + 1);
      }
    } catch { setStorageError('Device storage is unavailable. You can still calculate without saving.'); }
    setStorageReady(true);
    return () => requestManager.cancel();
  }, []);

  useEffect(() => {
    if (!storageReady || !remember) return;
    const draft = minimalDraft(d);
    const signature = JSON.stringify({ draft, result: res });
    if (signature === lastSaved.current) return;
    try {
      if (!saveCalculator(window.localStorage, draft, res)) {
        setStorageError('Could not save on this device. Your calculation is still available here.');
      } else {
        lastSaved.current = signature;
        setStorageError(null);
      }
    } catch { setStorageError('Device storage is unavailable. Your calculation is still available here.'); }
  }, [d, res, remember, storageReady]);

  useEffect(() => { if (res) resultRef.current?.focus(); }, [res]);

  function edit(next: BirthDetails) {
    requests.current.cancel();
    setLoading(false);
    setD(next);
    setRes(null);
    setErr(null);
  }

  function forgetSaved(): boolean {
    try {
      if (!clearCalculator(window.localStorage)) throw new Error();
      lastSaved.current = '';
      setStorageError(null);
      return true;
    } catch {
      setStorageError('Could not clear device storage. Clear this site\'s data in your browser settings.');
      return false;
    }
  }

  function clearAll() {
    requests.current.cancel();
    setRemember(false);
    forgetSaved();
    setD({ ...DEFAULT });
    setRes(null);
    setErr(null);
    setLoading(false);
    setFormKey(k => k + 1);
    formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    requests.current.cancel();
    setLoading(false);
    setRes(null);
    setErr(null);
    if (!d.birth_time_accuracy) { setErr('Choose whether your birth time is known, approximate or unknown.'); return; }
    const validation = validateBirth(d);
    if (!validation.ok) { setErr(validation.message); return; }
    if (!d.birth_city_confirmed) { setErr('Search for your birth city and select the correct match.'); return; }
    const controller = requests.current.start();
    setLoading(true);
    track('calculator_submitted', { tool: view });
    try {
      const { response, data } = await requestJson('/api/tools/chart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ person: validation.person }),
      }, 25_000);
      if (!requests.current.isCurrent(controller)) return;
      if (!response.ok) {
        setErr(response.status === 429 ? 'Too many calculations. Try again in a minute.' : response.status === 504
          ? 'Calculation took too long. Your details are unchanged; try again.' : 'Calculation is temporarily unavailable. Your details are unchanged; try again.');
        track('calculator_failed', { tool: view, reason: response.status === 429 ? 'rate_limited' : 'unavailable' });
        return;
      }
      const result = chartResultSchema.safeParse(data);
      if (!result.success) throw new Error('Invalid calculation response');
      setRes(result.data);
      track('calculator_result', { tool: view });
    } catch (error) {
      if (!requests.current.isCurrent(controller)) return;
      const timeout = error instanceof RequestTimeout;
      setErr(timeout ? 'Calculation took too long. Your details are unchanged; try again.' : 'Could not reach the calculation service. Your details are unchanged; try again.');
      track('calculator_failed', { tool: view, reason: timeout ? 'timeout' : 'unavailable' });
    } finally {
      if (requests.current.isCurrent(controller)) setLoading(false);
    }
  }

  const secondary = { href: '/sample-report', label: 'View a sample' };

  return (
    <div className="max-w-xl mx-auto">
      <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-4 border-y border-horizon py-6">
        <BirthDetailsInput key={formKey} value={d} onChange={edit} showName={false} />
        <label className="flex items-start gap-3 text-body-sm text-dust">
          <input type="checkbox" className="mt-1 shrink-0" checked={remember} onChange={e => {
            setRemember(e.target.checked);
            if (!e.target.checked) forgetSaved();
          }} />
          <span>Save my draft and result on this device for up to 7 days. Leave off on a shared device.</span>
        </label>
        {storageError && <p role="status" className="text-body-sm text-caution">{storageError}</p>}
        {err && <p role="alert" className="text-caution text-body-sm">{err}</p>}
        {d.birth_time_accuracy === 'unknown' && <Link href="/blog/kundli-without-birth-time" className="block text-body-sm text-star underline">Read birth-time help</Link>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex-1 min-w-0 py-3 flex justify-center items-center gap-2 disabled:opacity-50">
            <Calculator size={18} aria-hidden="true" />{loading ? 'Calculating...' : 'Calculate free'}
          </button>
          <button type="button" title="Clear details and saved result" aria-label="Clear details and saved result" onClick={clearAll}
            className="w-11 h-11 shrink-0 rounded-md border border-horizon flex items-center justify-center text-star"><Trash2 size={18} aria-hidden="true" /></button>
        </div>
        <p role="status" aria-live="polite" className="text-center text-body-sm text-dust">{loading ? 'Calculating your chart. You can edit or clear to cancel.' : 'Free. No login, email or card required.'}</p>
      </form>

      {res && (
        <section ref={resultRef} tabIndex={-1} aria-label="Calculation result" className="mt-6 border-b border-horizon pb-6 text-center outline-none break-words">
          <p className="text-body-sm text-dust mb-4">Calculated snapshot: {new Date(res.calculated_at).toLocaleString()}. Transit and period results are for this timestamp.</p>
          {res.birth_time_accuracy === 'approximate' && <p role="note" className="text-body-sm text-caution mb-4">Provisional: calculated only at your entered estimate. No time interval was checked. Changing the birth time can change any of these results.</p>}
          <ResultView view={view} res={res} />
          <Glossary />
          <ShareResult title="My calculated Vedic chart" text={shareTextFor(view, res)} surface="calculator" utmCampaign="calculator_share" className="mt-6" />
          <div className="mt-6 flex flex-wrap justify-center items-center gap-4">
            <button type="button" className="flex items-center gap-2 text-body-sm text-star underline" onClick={() => {
              edit(d);
              formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
            }}><Pencil size={16} aria-hidden="true" />Edit birth details</button>
            {view !== 'fullchart' && <Link href="/free-kundli" className="text-body-sm text-star underline">Free full chart</Link>}
            <Link href={secondary.href} className="text-body-sm text-star underline">{secondary.label}</Link>
          </div>
        </section>
      )}
      {res && <TimingBridge />}
    </div>
  );
}

function Flag({ d }: { d: Dosha }) {
  return <>
    <p className={`font-display font-bold text-3xl mb-2 ${d.present === null ? 'text-dust' : 'text-star'}`}>{doshaLabel(d)}</p>
    {d.present === true && <p className="text-body-sm text-dust mb-3">{d.severity}{d.from.length ? ` (from ${d.from.join(', ')})` : ''}</p>}
    <p className="text-body-sm text-dust leading-relaxed">{d.note}</p>
  </>;
}
function Fact({ label, value, sub }: { label: string; value: string | null; sub?: string }) {
  return <>
    <h2 className="font-display text-headline-sm text-star mb-2">{label}</h2>
    <p className="font-display font-bold text-3xl text-star mb-2 break-words">{value ?? 'Unavailable'}</p>
    {sub && <p className="text-body-sm text-dust">{sub}</p>}
  </>;
}
function ResultView({ view, res }: { view: ToolView; res: ChartResult }) {
  if (view === 'manglik' || view === 'kaalsarp' || view === 'sadesati') {
    const title = view === 'manglik' ? 'Manglik (Mangal) pattern' : view === 'kaalsarp' ? 'Kaal Sarpa pattern' : 'Sade Sati';
    return <><h2 className="font-display text-headline-sm text-star mb-3">{title}</h2><Flag d={view === 'manglik' ? res.doshas.manglik : view === 'kaalsarp' ? res.doshas.kaalSarpa : res.doshas.sadeSati} /></>;
  }
  if (view === 'moonsign') return <Fact label="Moon sign (Rashi)" value={res.moon_sign} sub={`Birth star: ${res.moon_nakshatra ?? 'Unavailable'}`} />;
  if (view === 'nakshatra') return <Fact label="Birth star (Nakshatra)" value={res.moon_nakshatra} sub={`Subdivision (Pada): ${res.moon_nakshatra_pada ?? 'Unavailable'}`} />;
  if (view === 'lagna') return <Fact label="Ascendant (Lagna)" value={res.lagna} sub={res.lagna_degree != null ? `${res.lagna_degree.toFixed(2)} degrees within the sign` : undefined} />;
  if (view === 'dasha') return <>
    <Fact label="Current period (Mahadasha)" value={res.current_dasha?.mahadasha ?? null} sub={res.current_dasha ? `Sub-period: ${res.current_dasha.antardasha}` : undefined} />
    <dl className="mt-4 text-left divide-y divide-horizon">
      {res.dasha_sequence.map(d => <div key={`${d.planet}-${d.start_date}`} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-1 sm:gap-3 py-2 text-body-sm">
        <dt className="text-star">{d.planet}</dt><dd className="text-dust">{fmt(d.start_date)} to {fmt(d.end_date)}</dd>
      </div>)}
    </dl>
  </>;
  const rows = [
    ['Ascendant (Lagna)', res.lagna], ['Moon sign (Rashi)', res.moon_sign], ['Birth star (Nakshatra)', res.moon_nakshatra],
    ['Subdivision (Pada)', res.moon_nakshatra_pada], ['Sun sign', res.sun_sign],
    ['Current period (Dasha)', res.current_dasha ? `${res.current_dasha.mahadasha} / ${res.current_dasha.antardasha}` : null],
    ['Manglik', doshaLabel(res.doshas.manglik)], ['Kaal Sarpa', doshaLabel(res.doshas.kaalSarpa)], ['Sade Sati', doshaLabel(res.doshas.sadeSati)],
  ];
  return <>
    <h2 className="font-display text-headline-sm text-star mb-3">Your free chart snapshot</h2>
    <dl className="text-left divide-y divide-horizon">
      {rows.map(([k, v]) => <div key={k} className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-3 py-2 text-body-sm">
        <dt className="text-dust">{k}</dt><dd className="text-star sm:text-right min-w-0 break-words">{v ?? 'Unavailable'}</dd>
      </div>)}
    </dl>
    {res.doshas.sadeSati.present === null && <p className="mt-3 text-body-sm text-dust">{res.doshas.sadeSati.note}</p>}
  </>;
}

function Glossary() {
  return (
    <details className="mt-6 border-y border-horizon py-3 text-left text-body-sm text-dust">
      <summary className="cursor-pointer text-star">Calculated facts and astrological meaning</summary>
      <p className="mt-3">Signs and degrees describe positions calculated for the birth details entered, using the engine&apos;s Lahiri sidereal setting. They are not independently verified here.</p>
      <dl className="mt-3 space-y-2">
        <div><dt className="text-star">Lagna</dt><dd>The rising sign at the entered birth time and location; houses are counted from it.</dd></div>
        <div><dt className="text-star">Rashi, Nakshatra and Pada</dt><dd>The Moon&apos;s sign, star division and subdivision at the entered time.</dd></div>
        <div><dt className="text-star">Dasha</dt><dd>A period timeline calculated under the Vimshottari tradition, not a guaranteed future event.</dd></div>
        <div><dt className="text-star">Doshas and Sade Sati</dt><dd>Traditional pattern rules applied to calculated positions. Their meaning is an astrological interpretation, not a diagnosis or a prediction. Unavailable does not mean absent.</dd></div>
      </dl>
    </details>
  );
}
