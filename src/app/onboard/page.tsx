'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MandalaRing } from '@/components/ui/MandalaRing';
import { StarField } from '@/components/ui/StarField';
import { getPromoDiscount } from '@/lib/bypass';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportPlanId = 'free' | '7day' | 'monthly' | 'annual';

interface GeoPrice { amount: number; display: string; currency: string; }
interface GeoPrices { currency: string; prices: Record<string, GeoPrice>; }

interface FormData {
  name: string;
  email: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthLat: number | null;
  birthLng: number | null;
  currentCity: string;
  currentLat: number | null;
  currentLng: number | null;
  currentTzOffset: number | null;
  reportType: ReportPlanId;
  forecastStartDate: string;
}

interface GeoResult {
  display: string;
  lat: number;
  lng: number;
  tzOffset?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES = [
  'Calculating planetary positions…',
  'Analyzing your natal chart…',
  'Weaving your forecast…',
];

const STEP_META = [
  { label: 'About You', est: '30 sec' },
  { label: 'Birth Details', est: '1 min' },
  { label: 'Choose Plan', est: '30 sec' },
];

const REPORT_TYPES = [
  {
    id: 'free' as const,
    title: 'Preview Report',
    defaultPrice: 'Free',
    description: 'Birth chart + sample hora schedule',
  },
  {
    id: '7day' as const,
    plan_type: '7day' as const,
    title: '7-Day Forecast',
    defaultPrice: '$9.99',
    description: 'Hourly ratings + AI narrative for 7 days',
    popular: true,
  },
  {
    id: 'monthly' as const,
    plan_type: 'monthly' as const,
    title: 'Monthly Oracle',
    defaultPrice: '$19.99',
    description: '30-day calendar + nativity analysis + PDF',
  },
  {
    id: 'annual' as const,
    plan_type: 'annual' as const,
    title: 'Annual Oracle',
    defaultPrice: '$49.99',
    description: 'Full year forecast + monthly breakdowns + PDF',
    bestValue: true,
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function slideVariants(dir: 1 | -1) {
  return {
    initial: { opacity: 0, x: dir * 36 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
    exit: { opacity: 0, x: dir * -36, transition: { duration: 0.2 } },
  };
}

function Field({ label, hint, why, htmlFor, children }: {
  label: string; hint?: string; why?: string; htmlFor?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={htmlFor} className="font-mono text-label-sm text-dust/80 tracking-[0.1em] uppercase">{label}</label>
        {hint && <span className="font-mono text-mono-sm text-dust/40">{hint}</span>}
      </div>
      {children}
      {why && (
        <p className="font-body text-body-sm text-dust/40 mt-1.5 leading-snug italic">
          {why}
        </p>
      )}
    </div>
  );
}

// ── Step 1: Identity ──────────────────────────────────────────────────────────

interface Step1Props {
  form: FormData;
  update: (field: keyof FormData, value: string) => void;
  onNext: () => void;
}

function Step1({ form, update, onNext }: Step1Props) {
  const isValidEmail = (email: string) => email.includes('@') && email.includes('.');
  const canProceed = form.name.trim().length > 0 && form.email.trim().length > 0 && isValidEmail(form.email);

  return (
    <>
      <h1 className="font-body font-semibold text-star text-headline-lg mb-1.5">
        Begin Your Forecast
      </h1>
      <p className="font-body text-body-sm text-dust mb-7">
        Tell us who you are. This takes about 2 minutes total.
      </p>

      <div className="space-y-4">
        <Field label="Full Name" htmlFor="onboard-name" why="Used to personalize your report.">
          <input
            id="onboard-name"
            type="text"
            className="cosmic-input"
            placeholder="Arjuna Sharma"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            autoFocus
            required
          />
        </Field>
        <Field label="Email Address" htmlFor="onboard-email" why="We send your report here. Never shared.">
          <input
            id="onboard-email"
            type="email"
            className="cosmic-input"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="flex items-center gap-2 mt-5 mb-7">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-success shrink-0" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <span className="font-mono text-mono-sm text-dust/50">Encrypted & never sold</span>
      </div>

      <button className="btn-primary w-full" disabled={!canProceed} onClick={onNext}>
        Continue
      </button>
    </>
  );
}

// ── Step 2: Birth Details ─────────────────────────────────────────────────────

interface Step2Props {
  form: FormData;
  update: (field: keyof FormData, value: string) => void;
  geo: GeoResult | null;
  geoLoading: boolean;
  geoError: string | null;
  onGeocode: (city: string, isCurrent?: boolean) => void;
  currentGeo: GeoResult | null;
  currentGeoLoading: boolean;
  currentGeoError: string | null;
  onNext: () => void;
  onBack: () => void;
}

function Step2({ form, update, geo, geoLoading, geoError, onGeocode,
  currentGeo, currentGeoLoading, currentGeoError, onNext, onBack }: Step2Props) {
  return (
    <>
      <h1 className="font-body font-semibold text-star text-headline-lg mb-1.5">
        Birth Details
      </h1>
      <p className="font-body text-body-sm text-dust mb-7">
        Exact birth time gives precise Lagna. Approximate time still works — we show confidence bands.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Birth Date" htmlFor="onboard-birth-date">
            <input
              id="onboard-birth-date"
              type="date"
              className="cosmic-input"
              value={form.birthDate}
              onChange={(e) => update('birthDate', e.target.value)}
              required
            />
          </Field>
          <Field label="Birth Time" hint="HH:MM · local" htmlFor="onboard-birth-time"
                 why="Determines your rising sign (Lagna). Unknown? Use 12:00 — we adjust confidence.">
            <input
              id="onboard-birth-time"
              type="time"
              className="cosmic-input"
              value={form.birthTime}
              onChange={(e) => update('birthTime', e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Birth City" htmlFor="onboard-birth-city" why="For calculating planetary positions at your birth location.">
          <input
            id="onboard-birth-city"
            type="text"
            className="cosmic-input"
            placeholder="Lucknow, India"
            value={form.birthCity}
            onChange={(e) => update('birthCity', e.target.value)}
            onBlur={(e) => onGeocode(e.target.value, false)}
            required
          />
        </Field>

        {geoLoading && (
          <p className="font-mono text-mono-sm text-amber/60 animate-pulse tracking-wide">
            Locating birth coordinates…
          </p>
        )}
        {geoError && !geoLoading && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-button bg-caution/10 border border-caution/20">
            <span className="text-caution text-body-sm">⚠</span>
            <span className="font-mono text-mono-sm text-caution tracking-wide">{geoError}</span>
          </div>
        )}
        {geo && !geoLoading && !geoError && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-button bg-success/10 border border-success/20">
            <span className="text-success text-body-sm">📍</span>
            <span className="font-mono text-mono-sm text-success tracking-wide">
              {geo.display} ({geo.lat.toFixed(2)}°, {geo.lng.toFixed(2)}°)
            </span>
          </div>
        )}

        <div className="pt-3 border-t border-horizon/30">
          <Field label="Current City" htmlFor="onboard-current-city"
                 hint="Optional"
                 why="Hora times are calculated for where you live now. Leave blank to use birth city.">
            <input
              id="onboard-current-city"
              type="text"
              className="cosmic-input"
              placeholder="Dubai, UAE (or same as birth city)"
              value={form.currentCity}
              onChange={(e) => update('currentCity', e.target.value)}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value.trim() !== form.birthCity.trim()) {
                  onGeocode(e.target.value, true);
                }
              }}
            />
          </Field>
        </div>

        {currentGeoLoading && (
          <p className="font-mono text-mono-sm text-amber/60 animate-pulse tracking-wide">
            Locating current city…
          </p>
        )}
        {currentGeoError && !currentGeoLoading && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-button bg-caution/10 border border-caution/20">
            <span className="text-caution text-body-sm">⚠</span>
            <span className="font-mono text-mono-sm text-caution tracking-wide">{currentGeoError}</span>
          </div>
        )}
        {currentGeo && !currentGeoLoading && !currentGeoError && form.currentCity.trim() !== form.birthCity.trim() && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-button bg-success/10 border border-success/20">
            <span className="text-success text-body-sm">🌍</span>
            <span className="font-mono text-mono-sm text-success tracking-wide">
              {currentGeo.display} ({currentGeo.lat.toFixed(2)}°, {currentGeo.lng.toFixed(2)}°)
              {currentGeo.tzOffset !== undefined && (
                <span className="text-success/70 ml-2">
                  · UTC{currentGeo.tzOffset >= 0 ? '+' : ''}{(currentGeo.tzOffset / 60).toFixed(1)}
                </span>
              )}
            </span>
          </div>
        )}

        <div className="pt-3 border-t border-horizon/30">
          <Field label="Forecast Start Date" hint="Optional" htmlFor="onboard-forecast-start"
                 why="Leave blank to start from today. Enter any past or future date to analyse that period.">
            <input
              id="onboard-forecast-start"
              type="date"
              className="cosmic-input"
              value={form.forecastStartDate}
              onChange={(e) => update('forecastStartDate', e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="flex gap-3 mt-7">
        <button className="btn-secondary flex-1 py-3" onClick={onBack}>
          Back
        </button>
        <button
          className="btn-primary flex-[2] py-3"
          disabled={!form.birthDate || !form.birthTime || !form.birthCity.trim()}
          onClick={onNext}
        >
          Continue
        </button>
      </div>
    </>
  );
}

// ── Step 3: Plan Selection ────────────────────────────────────────────────────

interface Step3Props {
  form: FormData;
  setReportType: (id: ReportPlanId) => void;
  onSubmit: () => void;
  onAdminFreeSubmit: () => void;
  onBack: () => void;
  promoCode: string;
  setPromoCode: (v: string) => void;
  promoDiscount: number;
  hasBypass: boolean;
  isAdmin: boolean;
  geoPrices: GeoPrices | null;
}

function Step3({
  form, setReportType, onSubmit, onAdminFreeSubmit, onBack,
  promoCode, setPromoCode, promoDiscount, hasBypass, isAdmin, geoPrices,
}: Step3Props) {
  const paidPlan = form.reportType === '7day' || form.reportType === 'monthly' || form.reportType === 'annual';
  const fullPromo = paidPlan && promoDiscount >= 100;

  function displayPrice(rt: typeof REPORT_TYPES[number]): string {
    if (rt.id === 'free') return 'Free';
    if ('plan_type' in rt && geoPrices?.prices[rt.plan_type]) {
      return geoPrices.prices[rt.plan_type].display;
    }
    return rt.defaultPrice;
  }

  return (
    <>
      <h1 className="font-body font-semibold text-star text-headline-lg mb-1.5">
        Choose Your Report
      </h1>
      <p className="font-body text-body-sm text-dust mb-7">
        One-time payment. Instant delivery. No subscriptions.
      </p>

      <div className="space-y-3 mb-6">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.id}
            className={`w-full text-left px-4 py-3.5 rounded-card border transition-all duration-200 ${
              form.reportType === rt.id
                ? 'border-amber bg-amber/[0.06] shadow-glow-amber'
                : 'border-horizon hover:border-amber/25'
            }`}
            onClick={() => setReportType(rt.id)}
          >
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="font-body text-title-lg text-star">{rt.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                {'popular' in rt && rt.popular && (
                  <span className="font-mono text-label-sm px-2 py-0.5 rounded-badge bg-amber text-space uppercase tracking-wider">
                    Popular
                  </span>
                )}
                {'bestValue' in rt && rt.bestValue && (
                  <span className="font-mono text-label-sm px-2 py-0.5 rounded-badge bg-amber/20 text-amber uppercase tracking-wider">
                    Best Value
                  </span>
                )}
                <span className="font-mono text-mono-lg text-amber">{displayPrice(rt)}</span>
              </div>
            </div>
            <p className="font-body text-body-sm text-dust">{rt.description}</p>
            {form.reportType === rt.id && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber" />
                <span className="font-mono text-label-sm text-amber tracking-wider">SELECTED</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <label className="font-mono text-label-sm text-dust/60 tracking-[0.1em] uppercase block mb-1.5">
          Promo code
        </label>
        <input
          type="text"
          className="cosmic-input"
          placeholder="Enter code (optional)"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          autoComplete="off"
        />
        {promoDiscount > 0 && (
          <p className="font-mono text-mono-sm text-success mt-2 tracking-wide">
            ✓ {promoDiscount}% discount{fullPromo ? ' — no payment required' : ' at checkout'}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <button className="btn-secondary flex-1 py-3" onClick={onBack}>
            Back
          </button>
          <button className="btn-primary flex-[2] py-3" onClick={onSubmit}>
            {hasBypass || fullPromo ? 'Generate Report Free' : 'Generate Report'}
          </button>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="w-full py-3 border border-success/40 text-success font-body text-body-sm rounded-button hover:bg-success/10 transition-colors"
            onClick={onAdminFreeSubmit}
          >
            Generate Free Report (admin)
          </button>
        )}

        {paidPlan && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-dust shrink-0" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-mono text-mono-sm text-dust text-center">
              48-hour money-back guarantee · No questions asked
            </span>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function OnboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [form, setForm] = useState<FormData>({
    name: '', email: '',
    birthDate: '', birthTime: '', birthCity: '',
    birthLat: null, birthLng: null,
    currentCity: '', currentLat: null, currentLng: null, currentTzOffset: null,
    reportType: 'free',
    forecastStartDate: '',
  });
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [currentGeo, setCurrentGeo] = useState<GeoResult | null>(null);
  const [currentGeoLoading, setCurrentGeoLoading] = useState(false);
  const [currentGeoError, setCurrentGeoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hasBypass, setHasBypass] = useState(false);
  const [bypassToken, setBypassToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [geoPrices, setGeoPrices] = useState<GeoPrices | null>(null);

  const promoDiscount = getPromoDiscount(promoCode);

  function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.body.appendChild(script);
    });
  }

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace(`/login?next=${encodeURIComponent('/onboard' + window.location.search)}`);
      }
    });
  }, [router]);

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan === 'preview') {
      setForm((prev) => ({ ...prev, reportType: 'free' }));
    } else if (plan === '7day' || plan === 'monthly' || plan === 'annual' || plan === 'free') {
      setForm((prev) => ({ ...prev, reportType: plan }));
    }
  }, [searchParams]);

  useEffect(() => {
    const b = searchParams.get('bypass');
    if (!b) { setHasBypass(false); setBypassToken(null); return; }
    let cancelled = false;
    fetch('/api/onboard/bypass-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bypass: b }),
    })
      .then((r) => r.json())
      .then((d: { ok?: boolean }) => {
        if (cancelled) return;
        if (d?.ok) { setHasBypass(true); setBypassToken(b); }
        else { setHasBypass(false); setBypassToken(null); }
      })
      .catch(() => { if (!cancelled) { setHasBypass(false); setBypassToken(null); } });
    return () => { cancelled = true; };
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/user/is-admin', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { admin?: boolean }) => setIsAdmin(!!d?.admin))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    fetch('/api/geo')
      .then((r) => r.json())
      .then((d: { currency?: string; prices?: Record<string, GeoPrice> }) => {
        if (d?.currency && d?.prices) {
          setGeoPrices({ currency: d.currency, prices: d.prices });
        }
      })
      .catch(() => { /* non-fatal, fallback to default prices */ });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ birthDate?: string; birthTime?: string; birthCity?: string }>).detail;
      if (d?.birthDate) update('birthDate', d.birthDate);
      if (d?.birthTime) update('birthTime', d.birthTime);
      if (d?.birthCity) update('birthCity', d.birthCity);
    };
    window.addEventListener('e2e-sync-step2', handler);
    return () => window.removeEventListener('e2e-sync-step2', handler);
  }, []);

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function next() { setDir(1); setStep((s) => s + 1); }
  function back() { setDir(-1); setStep((s) => s - 1); }

  function setReportType(id: ReportPlanId) {
    setForm((prev) => ({ ...prev, reportType: id }));
  }

  async function geocodeCity(city: string, isCurrent = false) {
    if (!city.trim()) return;
    if (isCurrent) { setCurrentGeoLoading(true); setCurrentGeoError(null); setCurrentGeo(null); }
    else { setGeoLoading(true); setGeoError(null); setGeo(null); }

    try {
      const res = await fetch(`/api/geocode?city=${encodeURIComponent(city)}`);
      if (!res.ok) {
        const err = 'Location lookup failed. You can continue without it.';
        if (isCurrent) setCurrentGeoError(err); else setGeoError(err);
        return;
      }
      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
      if (data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const name = data[0].display_name.split(',').slice(0, 3).join(',').trim();
        const displayLower = (name + ' ' + city).toLowerCase();
        const knownTz: Record<string, number> = {
          'dubai': 240, 'uae': 240, 'abu dhabi': 240, 'sharjah': 240,
          'india': 330, 'mumbai': 330, 'delhi': 330, 'bangalore': 330,
          'singapore': 480, 'hong kong': 480, 'london': 0, 'new york': -300,
        };
        let tzOffset = Math.round((lng / 15) * 60 / 30) * 30;
        for (const [key, val] of Object.entries(knownTz)) {
          if (displayLower.includes(key)) { tzOffset = val; break; }
        }
        const geoResult: GeoResult = { display: name, lat, lng, tzOffset };
        if (isCurrent) {
          setCurrentGeo(geoResult);
          setForm((prev) => ({ ...prev, currentLat: lat, currentLng: lng, currentTzOffset: tzOffset }));
        } else {
          setGeo(geoResult);
          setForm((prev) => ({ ...prev, birthLat: lat, birthLng: lng }));
        }
      } else {
        const err = 'City not found. Try a different spelling.';
        if (isCurrent) setCurrentGeoError(err); else setGeoError(err);
      }
    } catch {
      const msg = 'Location lookup failed. You can continue without it.';
      if (isCurrent) setCurrentGeoError(msg); else setGeoError(msg);
    } finally {
      if (isCurrent) setCurrentGeoLoading(false); else setGeoLoading(false);
    }
  }

  async function goToReportGeneration(opts?: { forcePaidPlan?: boolean }) {
    setIsLoading(true);
    setLoadingStage(0);
    stageTimer.current = setInterval(() => {
      setLoadingStage((s) => { if (s >= 2) { clearInterval(stageTimer.current!); return 2; } return s + 1; });
    }, 1400);

    try {
      await fetch('/api/agents/ephemeris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'natal-chart',
          birth_date: form.birthDate,
          birth_time: `${form.birthTime}:00`,
          birth_city: form.birthCity,
          birth_lat: form.birthLat ?? 0,
          birth_lng: form.birthLng ?? 0,
        }),
      });
    } catch (err) {
      console.error('Ephemeris API call failed (non-blocking):', err);
    } finally {
      clearInterval(stageTimer.current!);
    }

    const useCurrent = form.currentCity.trim() && form.currentLat != null && form.currentLng != null;
    const displayCity = useCurrent ? `${form.currentCity} (born: ${form.birthCity})` : form.birthCity;

    let effectiveType: ReportPlanId = form.reportType;
    if (opts?.forcePaidPlan && form.reportType === 'free') effectiveType = '7day';

    const paramsObj: Record<string, string> = {
      name: form.name, date: form.birthDate, time: form.birthTime, city: displayCity,
      lat: String(form.birthLat ?? ''), lng: String(form.birthLng ?? ''), type: effectiveType,
      ...(form.forecastStartDate ? { forecastStart: form.forecastStartDate } : {}),
    };

    if (effectiveType !== 'free') {
      const row = REPORT_TYPES.find((r) => r.id === effectiveType);
      if (row && 'plan_type' in row) paramsObj.plan_type = row.plan_type;
    }

    if (hasBypass && bypassToken) {
      void fetch('/api/onboard/record-bypass-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          bypass: bypassToken, plan_type: paramsObj.plan_type ?? effectiveType,
          name: form.name, birth_date: form.birthDate, birth_time: form.birthTime, birth_city: form.birthCity,
        }),
      }).catch(() => {});
    }

    if (useCurrent) {
      paramsObj.currentCity = form.currentCity;
      paramsObj.currentLat = String(form.currentLat);
      paramsObj.currentLng = String(form.currentLng);
      if (form.currentTzOffset != null) paramsObj.currentTz = String(form.currentTzOffset);
    }

    if (hasBypass && bypassToken) paramsObj.bypass = bypassToken;

    const reportId = crypto.randomUUID();
    const isPaidPlan = effectiveType !== 'free';
    const needsPayment = isPaidPlan && !hasBypass && promoDiscount < 100;
    const params = new URLSearchParams(paramsObj);
    if (needsPayment) params.set('payment_status', 'paid');
    const finalUrl = `/report/${reportId}?${params.toString()}`;

    if (needsPayment) {
      try {
        const intentRes = await fetch('/api/ziina/create-intent', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ planType: effectiveType, reportId }),
        });
        if (!intentRes.ok) {
          // Ziina not configured — fall back to Razorpay
          const fallbackRes = await fetch('/api/razorpay/create-order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ planType: effectiveType, reportId }),
          });
          const order = await fallbackRes.json() as {
            orderId: string; amount: number; currency: string; keyId: string; testMode?: boolean;
          };
          if (order.testMode || order.orderId?.startsWith('test_')) { router.push(finalUrl); return; }
          await loadRazorpayScript();
          setIsLoading(false);
          const RazorpayConstructor = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay;
          const rzp = new RazorpayConstructor({
            key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId,
            name: 'VedicHour',
            description: `${effectiveType === '7day' ? '7-Day Forecast' : effectiveType === 'monthly' ? 'Monthly Oracle' : 'Annual Oracle'}`,
            image: '/icons/icon-192.png',
            handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
              try {
                await fetch('/api/razorpay/verify-payment', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                  body: JSON.stringify({
                    orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature, planType: effectiveType, reportId,
                    amount: order.amount, currency: order.currency,
                  }),
                });
              } catch (e) { console.error('Payment verification failed:', e); }
              router.push(finalUrl);
            },
            modal: { ondismiss: () => { setIsLoading(false); } },
            prefill: { name: form.name, email: form.email },
            theme: { color: '#D4A853' },
          });
          rzp.open();
          return;
        }

        const intent = await intentRes.json() as { intentId?: string; redirectUrl?: string };
        if (!intent.redirectUrl) throw new Error('No redirect URL from Ziina');

        // Store the final report URL in sessionStorage so we can resume after payment redirect
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('ziina_report_url', finalUrl);
          sessionStorage.setItem('ziina_report_id', reportId);
        }

        // Redirect user to Ziina's hosted payment page
        window.location.href = intent.redirectUrl;
        return;
      } catch (err) {
        console.error('Payment checkout failed:', err);
        setIsLoading(false);
        return;
      }
    }
    router.push(finalUrl);
  }

  function handleSubmit() { void goToReportGeneration(); }
  function handleAdminFreeSubmit() { void goToReportGeneration({ forcePaidPlan: true }); }

  const vars = slideVariants(dir);

  return (
    <main className="relative min-h-screen bg-space flex flex-col items-center justify-center px-4 py-10 md:py-14 overflow-hidden">
      <StarField />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
        <MandalaRing className="w-[500px] h-[500px] text-amber" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {hasBypass && (
          <div className="mb-4 px-4 py-3 rounded-card border border-success/30 bg-success/10 text-success font-mono text-mono-sm tracking-wide text-center">
            ✓ Admin access — payment bypassed
          </div>
        )}
        {isAdmin && (
          <div className="mb-4 px-4 py-3 rounded-card border border-success/20 bg-success/5 text-dust font-mono text-mono-sm tracking-wide text-center">
            Admin account — use &quot;Generate Free Report (admin)&quot; on the last step.
          </div>
        )}

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-display font-semibold text-xl tracking-wide text-star/60">
            VedicHour
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2.5">
            {STEP_META.map((meta, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-label-sm font-mono transition-colors ${
                  i === step ? 'bg-amber text-space' : i < step ? 'bg-amber/20 text-amber' : 'bg-horizon/50 text-dust/40'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`font-body text-label-sm hidden sm:inline ${
                  i === step ? 'text-star' : 'text-dust/50'
                }`}>
                  {meta.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-horizon/30 rounded-pill overflow-hidden">
            <div
              className="h-full bg-amber rounded-pill transition-all duration-350 ease-out-expo"
              style={{ width: `${((step + 1) / 3) * 100}%` }}
            />
          </div>
          <p className="font-mono text-mono-sm text-dust/40 mt-1.5 text-right">
            ~{STEP_META[step]?.est}
          </p>
        </div>

        {/* Card */}
        <div className="card p-7 md:p-8 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 && (
              <motion.div key="step1" initial={vars.initial} animate={vars.animate} exit={vars.exit}>
                <Step1 form={form} update={update} onNext={next} />
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="step2" initial={vars.initial} animate={vars.animate} exit={vars.exit}>
                <Step2
                  form={form} update={update}
                  geo={geo} geoLoading={geoLoading} geoError={geoError} onGeocode={geocodeCity}
                  currentGeo={currentGeo} currentGeoLoading={currentGeoLoading} currentGeoError={currentGeoError}
                  onNext={next} onBack={back}
                />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="step3" initial={vars.initial} animate={vars.animate} exit={vars.exit}>
                <Step3
                  form={form} setReportType={setReportType}
                  onSubmit={handleSubmit} onAdminFreeSubmit={handleAdminFreeSubmit} onBack={back}
                  promoCode={promoCode} setPromoCode={setPromoCode} promoDiscount={promoDiscount}
                  hasBypass={hasBypass} isAdmin={isAdmin} geoPrices={geoPrices}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-space/95 backdrop-blur-sm flex flex-col items-center justify-center z-[60]"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              className="mb-10"
            >
              <MandalaRing className="w-32 h-32 text-amber opacity-60" />
            </motion.div>

            <motion.p
              key={loadingStage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-body text-body-lg text-star mb-2 text-center"
            >
              {STAGES[loadingStage]}
            </motion.p>

            <p className="font-mono text-mono-sm text-dust/50 tracking-wider mb-8">
              Stage {loadingStage + 1} of 3
            </p>

            <div className="w-56 h-1 bg-horizon rounded-pill overflow-hidden">
              <motion.div
                className="h-full bg-amber rounded-pill"
                animate={{ width: `${((loadingStage + 1) / 3) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-space flex items-center justify-center">
          <MandalaRing className="w-20 h-20 text-amber opacity-50" />
        </div>
      }
    >
      <OnboardPageInner />
    </Suspense>
  );
}
