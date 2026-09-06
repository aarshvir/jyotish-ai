'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BirthDetailsInput, type BirthDetails } from '@/components/forms/BirthDetailsInput';
import { hasValidBirthCoords } from '@/lib/utils/coords';
import { ShareResult } from '@/components/shared/ShareResult';
import { TimingBridge } from '@/components/tools/TimingBridge';
import { writeOnboardDraft } from '@/lib/onboard/draft';
import { UNLOCK_7DAY_HREF } from '@/lib/pricing';

export type ToolView =
  | 'manglik'
  | 'kaalsarp'
  | 'sadesati'
  | 'dasha'
  | 'nakshatra'
  | 'moonsign'
  | 'lagna'
  | 'fullchart';

type Dosha = { present: boolean; severity: string; from: string[]; note: string };
type Dasha = { planet: string; start_date: string; end_date: string };
type ChartResult = {
  lagna: string | null;
  lagna_degree: number | null;
  sun_sign: string | null;
  moon_sign: string | null;
  moon_nakshatra: string | null;
  moon_nakshatra_pada: number | null;
  mars_house: number | null;
  mars_sign: string | null;
  current_dasha: { mahadasha: string; antardasha: string; start_date: string; end_date: string } | null;
  dasha_sequence: Dasha[];
  /** null until the dosha soft gate is satisfied (signed in, or email left). */
  doshas: { manglik: Dosha; kaalSarpa: Dosha; sadeSati: Dosha } | null;
  doshas_locked?: boolean;
};

const DEFAULT: BirthDetails = {
  name: '', birth_date: '', birth_time: '12:00:00', birth_city: '', birth_lat: 0, birth_lng: 0,
};

const fmt = (iso: string) => (iso ? iso.slice(0, 10) : '');

// A factual, outcome-neutral one-liner describing the computed result — no claims, no luck.
/** What the visitor just calculated — keeps the timing-bridge copy specific to the tool. */
function anchorLabelFor(view: ToolView): string {
  switch (view) {
    case 'lagna': return 'Your Lagna';
    case 'moonsign': return 'Your Moon sign';
    case 'nakshatra': return 'Your nakshatra';
    case 'dasha': return 'Your dasha';
    case 'manglik':
    case 'kaalsarp':
    case 'sadesati': return 'This reading';
    default: return 'Your chart';
  }
}

function shareTextFor(view: ToolView, res: ChartResult): string {
  const doshaLine = (label: string, dosha: Dosha) =>
    `${label}: ${dosha.present ? `present (${dosha.severity})` : 'not present'}`;
  switch (view) {
    case 'manglik':
      return res.doshas
        ? `${doshaLine('Manglik (Mangal) Dosha', res.doshas.manglik)} — computed free on VedicHour.`
        : 'Checked my Manglik (Mangal) Dosha free on VedicHour.';
    case 'kaalsarp':
      return res.doshas
        ? `${doshaLine('Kaal Sarpa Dosha', res.doshas.kaalSarpa)} — computed free on VedicHour.`
        : 'Checked my Kaal Sarpa Dosha free on VedicHour.';
    case 'sadesati':
      return res.doshas
        ? `${doshaLine('Sade Sati', res.doshas.sadeSati)} — computed free on VedicHour.`
        : 'Checked my Sade Sati free on VedicHour.';
    case 'dasha':
      return `My current Mahadasha is ${res.current_dasha?.mahadasha ?? '—'} — computed free on VedicHour.`;
    case 'nakshatra':
      return `My birth star (Nakshatra) is ${res.moon_nakshatra ?? '—'}${res.moon_nakshatra_pada ? ` pada ${res.moon_nakshatra_pada}` : ''} — computed free on VedicHour.`;
    case 'moonsign':
      return `My Moon sign (Rashi) is ${res.moon_sign ?? '—'} — computed free on VedicHour.`;
    case 'lagna':
      return `My Lagna (Ascendant) is ${res.lagna ?? '—'} — computed free on VedicHour.`;
    case 'fullchart':
      return `My Kundli: ${res.lagna ?? '—'} rising, Moon in ${res.moon_sign ?? '—'}${res.moon_nakshatra ? ` (${res.moon_nakshatra})` : ''} — computed free on VedicHour.`;
    default:
      return 'Computed free on VedicHour.';
  }
}

export function ChartTool({
  view,
  ctaHref = '/kundali',
  ctaLabel = 'Get your full Kundli report',
}: {
  view: ToolView;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const [d, setD] = useState<BirthDetails>({ ...DEFAULT });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<ChartResult | null>(null);
  const [gateEmail, setGateEmail] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [revealErr, setRevealErr] = useState<string | null>(null);

  const valid = !!d.birth_date && hasValidBirthCoords(d);
  // Lagna (ascendant) and the full chart depend on an exact birth time, so the
  // "use noon" shortcut would defeat the calculation — hide it for those views.
  const requiresExactBirthTime = view === 'lagna' || view === 'fullchart';

  async function postChart(email?: string): Promise<ChartResult> {
    const r = await fetch('/api/tools/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        person: {
          birth_date: d.birth_date,
          birth_time: d.birth_time || '12:00:00',
          birth_city: d.birth_city,
          birth_lat: d.birth_lat,
          birth_lng: d.birth_lng,
        },
        ...(email ? { email } : {}),
      }),
    });
    const data = (await r.json().catch(() => ({}))) as ChartResult & { error?: string };
    if (!r.ok) throw new Error(data.error ?? 'Could not calculate. Please try again.');
    return data;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setRes(null);
    if (!valid) { setErr('Enter your birth date and confirm your birth city.'); return; }
    setLoading(true);
    try {
      setRes(await postChart());
      writeOnboardDraft({
        name: d.name?.trim() || '',
        birthDate: d.birth_date,
        birthTime: d.birth_time || '12:00:00',
        birthCity: d.birth_city,
        birthLat: d.birth_lat,
        birthLng: d.birth_lng,
        reportType: '7day',
        promoCode: '',
      });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /** Re-runs the same calculation with the email attached, which unlocks the doshas. */
  async function onReveal(e: React.FormEvent) {
    e.preventDefault();
    setRevealErr(null);
    const email = gateEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setRevealErr('Enter a valid email address.');
      return;
    }
    setRevealing(true);
    try {
      setRes(await postChart(email));
    } catch (e2) {
      setRevealErr(e2 instanceof Error ? e2.message : 'Network error. Please try again.');
    } finally {
      setRevealing(false);
    }
  }

  const lock = (
    <DoshaLock
      email={gateEmail}
      onEmailChange={setGateEmail}
      onSubmit={onReveal}
      busy={revealing}
      error={revealErr}
    />
  );

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={onSubmit} className="card border border-horizon rounded-card p-6 space-y-4">
        <BirthDetailsInput value={d} onChange={setD} showName={false} allowUnknownTime={!requiresExactBirthTime} />
        {requiresExactBirthTime && (
          <p className="font-mono text-mono-sm text-dust">An exact birth time is required for an accurate {view === 'lagna' ? 'ascendant' : 'chart'}.</p>
        )}
        {err && <p className="text-caution text-body-sm">{err}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading ? 'Calculating…' : 'Calculate — free'}
        </button>
        <p className="text-center font-mono text-mono-sm text-dust">Free · no login · no card</p>
      </form>

      {res && (
        <div className="mt-6 rounded-card border border-amber/30 bg-gradient-to-br from-amber/[0.07] via-cosmos to-cosmos p-6 sm:p-8 text-center">
          <ResultView view={view} res={res} lock={lock} />
          <ShareResult
            title="My Vedic chart · VedicHour"
            text={shareTextFor(view, res)}
            surface="calculator"
            utmCampaign="calculator_share"
            className="mt-7"
          />
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={UNLOCK_7DAY_HREF}
              data-track="calculator-unlock-hours"
              className="btn-primary inline-block px-7 py-3"
            >
              Unlock my hour-by-hour forecast →
            </Link>
            <Link
              href={ctaHref}
              className="inline-block px-7 py-2.5 rounded-button border border-horizon text-dust hover:text-star hover:border-amber/40 transition-colors duration-250"
            >
              {ctaLabel} →
            </Link>
          </div>
          <p className="mt-3 font-mono text-mono-sm text-dust">
            Your birth details are saved on this device — no re-typing on the next step.
          </p>
        </div>
      )}

      {res && <TimingBridge anchorLabel={anchorLabelFor(view)} href={UNLOCK_7DAY_HREF} />}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="section-eyebrow mb-3">{children}</p>;
}

function Flag({ d }: { d: Dosha }) {
  return (
    <>
      <p className={`font-display font-bold text-5xl mb-2 ${d.present ? 'text-amber' : 'text-success'}`}>
        {d.present ? 'Yes' : 'No'}
      </p>
      {d.present && (
        <p className="font-mono text-mono-sm text-dust/70 mb-4 uppercase tracking-wider">
          {d.severity}{d.from.length ? ` · from ${d.from.join(', ')}` : ''}
        </p>
      )}
      <p className="font-body text-body-sm text-dust leading-relaxed max-w-md mx-auto">{d.note}</p>
    </>
  );
}

/**
 * Soft gate for the dosha verdicts: the answer is already computed server-side but is
 * withheld until an email is left (or the visitor is signed in). The verdict itself is
 * never sent to the browser while locked, so the blur is a real lock, not CSS theatre.
 */
function DoshaLock({
  email,
  onEmailChange,
  onSubmit,
  busy,
  error,
}: {
  email: string;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="mt-1">
      <div aria-hidden className="select-none blur-md opacity-60 pointer-events-none">
        <p className="font-display font-bold text-5xl text-amber mb-2">Yes</p>
        <p className="font-mono text-mono-sm text-dust/70 uppercase tracking-wider">partial · from Mars</p>
      </div>
      <p className="mt-4 font-body text-body-sm text-dust leading-relaxed max-w-md mx-auto">
        Your result is ready. Enter your email to see it — free, no card.
      </p>
      <form onSubmit={onSubmit} className="mt-4 max-w-sm mx-auto space-y-2">
        <label className="block text-left text-body-sm text-dust">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-md bg-cosmos border border-horizon px-3 py-2.5 text-star focus:border-amber/60 focus:outline-none transition-colors"
          />
        </label>
        {error && <p className="text-caution text-body-sm text-left">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-50">
          {busy ? 'Revealing…' : 'Show my result'}
        </button>
      </form>
      <p className="mt-3 font-mono text-mono-sm text-dust">
        Want the full written analysis? That is the{' '}
        <Link href="/kundali" className="text-amber hover:underline">Kundli report</Link>.
      </p>
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <>
      <Eyebrow>{label}</Eyebrow>
      <p className="font-display font-bold text-5xl text-amber mb-1">{value}</p>
      {sub ? <p className="font-mono text-mono-sm text-dust">{sub}</p> : null}
    </>
  );
}

function DashaView({ res }: { res: ChartResult }) {
  const cd = res.current_dasha;
  return (
    <>
      <Eyebrow>Your current Mahadasha</Eyebrow>
      <p className="font-display font-bold text-4xl text-amber mb-1">{cd?.mahadasha ?? '—'}</p>
      {cd && (
        <p className="font-mono text-mono-sm text-dust mb-5">
          {cd.mahadasha} / {cd.antardasha} · {fmt(cd.start_date)} → {fmt(cd.end_date)}
        </p>
      )}
      {res.dasha_sequence.length > 0 && (
        <div className="max-w-sm mx-auto text-left space-y-1.5">
          <p className="font-mono text-mono-sm text-dust uppercase tracking-wider mb-2 text-center">Mahadasha timeline</p>
          {res.dasha_sequence.map((d) => {
            const active = cd?.mahadasha === d.planet && fmt(cd.start_date) === fmt(d.start_date);
            return (
              <div
                key={`${d.planet}-${d.start_date}`}
                className={`flex items-center justify-between rounded-md border px-3 py-1.5 ${active ? 'border-amber/50 bg-amber/10' : 'border-horizon/30 bg-bg-3/40'}`}
              >
                <span className={`font-body text-body-sm ${active ? 'text-amber' : 'text-dust/80'}`}>{d.planet}</span>
                <span className="font-mono text-mono-sm text-dust">{fmt(d.start_date)} – {fmt(d.end_date)}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function FullChart({ res, lock }: { res: ChartResult; lock: React.ReactNode }) {
  const rows = [
    ['Ascendant (Lagna)', res.lagna ?? '—'],
    ['Moon sign (Rashi)', res.moon_sign ?? '—'],
    ['Birth star (Nakshatra)', `${res.moon_nakshatra ?? '—'}${res.moon_nakshatra_pada ? ` · pada ${res.moon_nakshatra_pada}` : ''}`],
    ['Sun sign', res.sun_sign ?? '—'],
    ['Current period (Dasha)', res.current_dasha ? `${res.current_dasha.mahadasha} / ${res.current_dasha.antardasha}` : '—'],
  ];
  const doshaLine = (label: string, d: Dosha) => `${label}: ${d.present ? `Yes (${d.severity})` : 'No'}`;
  return (
    <>
      <Eyebrow>Your free Kundli snapshot</Eyebrow>
      <div className="max-w-sm mx-auto text-left space-y-1.5 mb-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-md bg-bg-3/40 border border-horizon/30 px-3 py-2">
            <span className="font-body text-body-sm text-dust/70">{k}</span>
            <span className="font-body text-body-sm text-star">{v}</span>
          </div>
        ))}
      </div>
      {res.doshas ? (
        <p className="font-mono text-mono-sm text-dust">
          {doshaLine('Manglik', res.doshas.manglik)} · {doshaLine('Kaal Sarpa', res.doshas.kaalSarpa)} · {doshaLine('Sade Sati', res.doshas.sadeSati)}
        </p>
      ) : (
        <>
          <Eyebrow>Manglik · Kaal Sarpa · Sade Sati</Eyebrow>
          {lock}
        </>
      )}
    </>
  );
}

function ResultView({ view, res, lock }: { view: ToolView; res: ChartResult; lock: React.ReactNode }) {
  switch (view) {
    case 'manglik':
      return <><Eyebrow>Manglik (Mangal) Dosha</Eyebrow>{res.doshas ? <Flag d={res.doshas.manglik} /> : lock}</>;
    case 'kaalsarp':
      return <><Eyebrow>Kaal Sarpa Dosha</Eyebrow>{res.doshas ? <Flag d={res.doshas.kaalSarpa} /> : lock}</>;
    case 'sadesati':
      return <><Eyebrow>Sade Sati</Eyebrow>{res.doshas ? <Flag d={res.doshas.sadeSati} /> : lock}</>;
    case 'dasha':
      return <DashaView res={res} />;
    case 'nakshatra':
      return (
        <Fact
          label="Your Nakshatra (birth star)"
          value={res.moon_nakshatra ?? '—'}
          sub={`${res.moon_nakshatra_pada ? `Pada ${res.moon_nakshatra_pada} · ` : ''}Moon sign: ${res.moon_sign ?? '—'}`}
        />
      );
    case 'moonsign':
      return <Fact label="Your Moon Sign (Rashi)" value={res.moon_sign ?? '—'} sub={`Nakshatra: ${res.moon_nakshatra ?? '—'}`} />;
    case 'lagna':
      return (
        <Fact
          label="Your Lagna (Ascendant)"
          value={res.lagna ?? '—'}
          sub={res.lagna_degree != null ? `${res.lagna_degree.toFixed(2)}° in ${res.lagna ?? ''}` : ''}
        />
      );
    case 'fullchart':
      return <FullChart res={res} lock={lock} />;
    default:
      return null;
  }
}
