'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MandalaRing } from '@/components/ui/MandalaRing';
import { StarField } from '@/components/ui/StarField';
import { getPromoDiscount } from '@/lib/bypass';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportPlanId = 'free' | '7day' | 'monthly' | 'annual';

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
}

interface GeoResult {
  display: string;
  lat: number;
  lng: number;
  tzOffset?: number; // minutes east of UTC
}

// ── Loading overlay stages ────────────────────────────────────────────────────

const STAGES = [
  'Calculating planetary positions…',
  'Analyzing your natal chart…',
  'Weaving your forecast…',
];

// ── Report type options ───────────────────────────────────────────────────────

const REPORT_TYPES = [
  {
    id: 'free' as const,
    title: 'Preview Report',
    price: 'Free',
    description: 'Birth chart + sample hora schedule',
  },
  {
    id: '7day' as const,
    plan_type: '7day' as const,
    title: '7-Day Forecast',
    price: '$9.99',
    description: 'Hourly ratings + AI narrative for 7 days',
  },
  {
    id: 'monthly' as const,
    plan_type: 'monthly' as const,
    title: 'Monthly Oracle',
    price: '$19.99',
    description: '30-day calendar + nativity analysis + PDF',
  },
  {
    id: 'annual' as const,
    plan_type: 'annual' as const,
    title: 'Annual Oracle',
    price: '$49.99',
    description: 'Full year forecast + monthly breakdowns + PDF',
    bestValue: true,
  },
] as const;

// ── Slide transition variants ─────────────────────────────────────────────────

function slideVariants(dir: 1 | -1) {
  return {
    initial: { opacity: 0, x: dir * 40 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
    exit:    { opacity: 0, x: dir * -40, transition: { duration: 0.25 } },
  };
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="font-mono text-xs text-dust/80 tracking-[0.12em] uppercase">{label}</label>
        {hint && <span className="font-mono text-[10px] text-dust/50">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Step 1 — module level ─────────────────────────────────────────────────────

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
      <h1 className="font-display font-semibold text-star mb-2"
          style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
        Who Are You?
      </h1>
      <p className="font-body text-dust text-sm mb-8">Begin your journey.</p>

      <div className="space-y-5">
        <Field label="Full Name" hint="">
          <input
            type="text"
            className="cosmic-input"
            placeholder="Arjuna Sharma"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            autoFocus
            required
          />
        </Field>
        <Field label="Email Address" hint="">
          <input
            type="email"
            className="cosmic-input"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
          />
        </Field>
      </div>

      <p className="font-mono text-xs text-dust/50 mt-6 mb-8 tracking-wide">
        Your data is encrypted and never sold.
      </p>

      <button
        className="w-full py-3.5 bg-amber text-space font-body font-medium rounded-sm
                   hover:bg-amber-glow transition-colors disabled:opacity-40"
        disabled={!canProceed}
        onClick={onNext}
      >
        Continue
      </button>
    </>
  );
}

// ── Step 2 — module level ─────────────────────────────────────────────────────

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
      <h1 className="font-display font-semibold text-star mb-2"
          style={{ fontSize: 'clamp(28px, 3.5vw, 44px)' }}>
        When and Where Did You Arrive?
      </h1>
      <p className="font-body text-dust text-sm mb-8">
        Exact birth time gives precise Lagna. Current city gives accurate timing.
      </p>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Birth Date" hint="">
            <input
              type="date"
              className="cosmic-input"
              value={form.birthDate}
              onChange={(e) => update('birthDate', e.target.value)}
              required
            />
          </Field>
          <Field label="Birth Time" hint="HH:MM · local">
            <input
              type="time"
              className="cosmic-input"
              value={form.birthTime}
              onChange={(e) => update('birthTime', e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Birth City" hint="For natal chart calculation">
          <input
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
          <p className="font-mono text-xs text-amber/60 animate-pulse tracking-wide">
            Locating birth coordinates…
          </p>
        )}
        {geoError && !geoLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-crimson/10 border border-crimson/20"
          >
            <span className="text-crimson text-sm">⚠</span>
            <span className="font-mono text-xs text-crimson tracking-wide">{geoError}</span>
          </motion.div>
        )}
        {geo && !geoLoading && !geoError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-emerald/10 border border-emerald/20"
          >
            <span className="text-emerald text-sm">📍</span>
            <span className="font-mono text-xs text-emerald tracking-wide">
              {geo.display} ({geo.lat.toFixed(2)}°, {geo.lng.toFixed(2)}°)
            </span>
          </motion.div>
        )}

        {/* Current city divider */}
        <div className="pt-2 border-t border-horizon/30">
          <Field label="Current City" hint="Where you live NOW — for accurate daily timing">
            <input
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
          <p className="font-mono text-[10px] text-dust/40 mt-1.5">
            Hora times and scores are calculated for your current location. Leave blank to use birth city.
          </p>
        </div>

        {currentGeoLoading && (
          <p className="font-mono text-xs text-amber/60 animate-pulse tracking-wide">
            Locating current city…
          </p>
        )}
        {currentGeoError && !currentGeoLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-crimson/10 border border-crimson/20"
          >
            <span className="text-crimson text-sm">⚠</span>
            <span className="font-mono text-xs text-crimson tracking-wide">{currentGeoError}</span>
          </motion.div>
        )}
        {currentGeo && !currentGeoLoading && !currentGeoError && form.currentCity.trim() !== form.birthCity.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-emerald/10 border border-emerald/20"
          >
            <span className="text-emerald text-sm">🌍</span>
            <span className="font-mono text-xs text-emerald tracking-wide">
              {currentGeo.display} ({currentGeo.lat.toFixed(2)}°, {currentGeo.lng.toFixed(2)}°)
              {currentGeo.tzOffset !== undefined && (
                <span className="text-emerald/70 ml-2">
                  · UTC{currentGeo.tzOffset >= 0 ? '+' : ''}{(currentGeo.tzOffset / 60).toFixed(1)}
                </span>
              )}
            </span>
          </motion.div>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          className="flex-1 py-3 border border-horizon text-dust font-body text-sm rounded-sm hover:border-amber/30 hover:text-star transition-colors"
          onClick={onBack}
        >
          Back
        </button>
        <button
          className="flex-[2] py-3 bg-amber text-space font-body font-medium rounded-sm hover:bg-amber-glow transition-colors disabled:opacity-40"
          disabled={!form.birthDate || !form.birthTime || !form.birthCity.trim()}
          onClick={onNext}
        >
          Continue
        </button>
      </div>
    </>
  );
}

// ── Step 3 — module level ─────────────────────────────────────────────────────

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
}

function Step3({
  form,
  setReportType,
  onSubmit,
  onAdminFreeSubmit,
  onBack,
  promoCode,
  setPromoCode,
  promoDiscount,
  hasBypass,
  isAdmin,
}: Step3Props) {
  const paidPlan =
    form.reportType === '7day' ||
    form.reportType === 'monthly' ||
    form.reportType === 'annual';
  const fullPromo = paidPlan && promoDiscount >= 100;

  return (
    <>
      <h1 className="font-display font-semibold text-star mb-2"
          style={{ fontSize: 'clamp(28px, 3.5vw, 44px)' }}>
        Choose Your Oracle
      </h1>
      <p className="font-body text-dust text-sm mb-8">
        Select a report type to generate.
      </p>

      <div className="space-y-4 mb-8">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.id}
            className={`w-full text-left px-5 py-4 rounded-sm border transition-all duration-200 ${
              form.reportType === rt.id
                ? 'border-amber bg-amber/8 text-star'
                : 'border-horizon text-dust hover:border-amber/30 hover:text-star'
            }`}
            onClick={() => setReportType(rt.id)}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-display font-semibold text-lg">{rt.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                {'bestValue' in rt && rt.bestValue && (
                  <span className="font-mono text-[9px] tracking-[0.12em] px-2 py-0.5 rounded-sm bg-amber text-space uppercase whitespace-nowrap">
                    BEST VALUE
                  </span>
                )}
                <span className="font-mono text-sm text-amber">{rt.price}</span>
              </div>
            </div>
            <p className="font-body text-xs text-dust">{rt.description}</p>
            {form.reportType === rt.id && (
              <div className="mt-2 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber" />
                <span className="font-mono text-[10px] text-amber tracking-wider">SELECTED</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <label className="font-mono text-xs text-dust/80 tracking-[0.12em] uppercase block mb-1.5">
          Promo code (optional)
        </label>
        <input
          type="text"
          className="cosmic-input"
          placeholder="Promo code (optional)"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          autoComplete="off"
        />
        {promoDiscount > 0 && (
          <p className="font-mono text-xs text-emerald mt-2 tracking-wide">
            ✓ {promoDiscount}% discount
            {fullPromo ? ' — no payment required' : ' applies at Stripe checkout'}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              className="flex-1 py-3 border border-horizon text-dust font-body text-sm rounded-sm hover:border-amber/30 hover:text-star transition-colors"
              onClick={onBack}
            >
              Back
            </button>
            <button
              className="flex-[2] py-3 bg-amber text-space font-body font-medium rounded-sm hover:bg-amber-glow transition-colors"
              onClick={onSubmit}
            >
              {hasBypass || fullPromo ? 'Generate Report Free' : 'Generate Report'}
            </button>
          </div>
          {isAdmin && (
            <button
              type="button"
              className="w-full py-3 border border-emerald/50 text-emerald font-body text-sm rounded-sm hover:bg-emerald/10 transition-colors"
              onClick={onAdminFreeSubmit}
            >
              Generate Free Report (admin)
            </button>
          )}
        </div>

        {/* Money-back guarantee for paid plans */}
        {(form.reportType === '7day' || form.reportType === 'monthly' || form.reportType === 'annual') && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-dust shrink-0">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="font-mono text-xs text-dust text-center">
              48-hour money-back guarantee · No questions asked
            </span>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function OnboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [dir, setDir]   = useState<1 | -1>(1);
  const [form, setForm] = useState<FormData>({
    name: '', email: '',
    birthDate: '', birthTime: '', birthCity: '',
    birthLat: null, birthLng: null,
    currentCity: '', currentLat: null, currentLng: null, currentTzOffset: null,
    reportType: 'free',
  });
  const [geo, setGeo]                       = useState<GeoResult | null>(null);
  const [geoLoading, setGeoLoading]         = useState(false);
  const [geoError, setGeoError]             = useState<string | null>(null);
  const [currentGeo, setCurrentGeo]         = useState<GeoResult | null>(null);
  const [currentGeoLoading, setCurrentGeoLoading] = useState(false);
  const [currentGeoError, setCurrentGeoError]     = useState<string | null>(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [loadingStage, setLoadingStage]     = useState(0);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hasBypass, setHasBypass]           = useState(false);
  const [bypassToken, setBypassToken]       = useState<string | null>(null);
  const [isAdmin, setIsAdmin]               = useState(false);
  const [promoCode, setPromoCode]           = useState('');

  const promoDiscount = getPromoDiscount(promoCode);

  // Check for ?plan= URL param and pre-select report type
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
    if (!b) {
      setHasBypass(false);
      setBypassToken(null);
      return;
    }
    let cancelled = false;
    fetch('/api/onboard/bypass-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bypass: b }),
    })
      .then((r) => r.json())
      .then((d: { ok?: boolean }) => {
        if (cancelled) return;
        if (d?.ok) {
          setHasBypass(true);
          setBypassToken(b);
        } else {
          setHasBypass(false);
          setBypassToken(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasBypass(false);
          setBypassToken(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/user/is-admin', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { admin?: boolean }) => setIsAdmin(!!d?.admin))
      .catch(() => setIsAdmin(false));
  }, []);

  // E2E: allow orchestrator to sync step 2 form state (controlled inputs + Playwright)
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function next() { setDir(1);  setStep((s) => s + 1); }
  function back() { setDir(-1); setStep((s) => s - 1); }

  function setReportType(id: ReportPlanId) {
    setForm((prev) => ({ ...prev, reportType: id }));
  }

  // Detect timezone offset (minutes east of UTC) for a given lat/lng
  function detectTzOffset(lat: number, lng: number): number {
    // Approximate: use browser timezone for current location, or estimate from longitude
    // Each 15 degrees of longitude ≈ 1 hour
    // Known offsets for common cities:
    const knownTz: Record<string, number> = {
      // Dubai / UAE: UTC+4 = 240 min
      'dubai': 240, 'uae': 240, 'abu dhabi': 240, 'sharjah': 240,
      // India: UTC+5:30 = 330 min
      'india': 330, 'mumbai': 330, 'delhi': 330, 'bangalore': 330, 'lucknow': 330,
      // Singapore / HK: UTC+8 = 480 min
      'singapore': 480, 'hong kong': 480,
      // London: UTC+0 or UTC+1 (BST)
      'london': 0, 'uk': 0,
      // New York: UTC-5 = -300 min
      'new york': -300, 'nyc': -300,
    };
    // Return -based on browser timezone as best guess
    return -(new Date().getTimezoneOffset());
  }

  async function geocodeCity(city: string, isCurrent = false) {
    if (!city.trim()) return;

    if (isCurrent) {
      setCurrentGeoLoading(true);
      setCurrentGeoError(null);
      setCurrentGeo(null);
    } else {
      setGeoLoading(true);
      setGeoError(null);
      setGeo(null);
    }

    try {
      const res = await fetch(`/api/geocode?city=${encodeURIComponent(city)}`);

      if (!res.ok) {
        const err = 'Location lookup failed. You can continue without it.';
        if (isCurrent) setCurrentGeoError(err); else setGeoError(err);
        return;
      }

      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;

      if (data[0]) {
        const lat  = parseFloat(data[0].lat);
        const lng  = parseFloat(data[0].lon);
        const name = data[0].display_name.split(',').slice(0, 3).join(',').trim();
        const displayLower = (name + ' ' + city).toLowerCase();
        // Known offsets for common cities (Dubai +04:00 GMT = 240 min)
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
          console.log('✅ Current city geocoded:', { city, lat, lng, tzOffset });
        } else {
          setGeo(geoResult);
          setForm((prev) => ({ ...prev, birthLat: lat, birthLng: lng }));
          console.log('✅ Birth city geocoded:', { city, lat, lng });
        }
      } else {
        const err = 'City not found. Try a different spelling.';
        if (isCurrent) setCurrentGeoError(err); else setGeoError(err);
      }
    } catch (err) {
      const msg = 'Location lookup failed. You can continue without it.';
      if (isCurrent) setCurrentGeoError(msg); else setGeoError(msg);
      console.error('❌ Geocoding error:', err);
    } finally {
      if (isCurrent) setCurrentGeoLoading(false); else setGeoLoading(false);
    }
  }

  async function goToReportGeneration(opts?: { forcePaidPlan?: boolean }) {
    console.log('🚀 Submitting form:', form);
    
    setIsLoading(true);
    setLoadingStage(0);

    stageTimer.current = setInterval(() => {
      setLoadingStage((s) => {
        if (s >= 2) { clearInterval(stageTimer.current!); return 2; }
        return s + 1;
      });
    }, 1400);

    try {
      await fetch('/api/agents/ephemeris', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:       'natal-chart',
          birth_date: form.birthDate,
          birth_time: `${form.birthTime}:00`,
          birth_city: form.birthCity,
          birth_lat:  form.birthLat ?? 0,
          birth_lng:  form.birthLng ?? 0,
        }),
      });
    } catch (err) {
      console.error('⚠️ Ephemeris API call failed (non-blocking):', err);
    } finally {
      clearInterval(stageTimer.current!);
    }

    // Use current city if provided, else fall back to birth city
    const useCurrent = form.currentCity.trim() && form.currentLat != null && form.currentLng != null;
    const displayCity = useCurrent ? `${form.currentCity} (born: ${form.birthCity})` : form.birthCity;

    let effectiveType: ReportPlanId = form.reportType;
    if (opts?.forcePaidPlan && form.reportType === 'free') {
      effectiveType = '7day';
    }

    const paramsObj: Record<string, string> = {
      name: form.name,
      date: form.birthDate,
      time: form.birthTime,
      city: displayCity,
      lat:  String(form.birthLat ?? ''),
      lng:  String(form.birthLng ?? ''),
      type: effectiveType,
    };

    if (effectiveType !== 'free') {
      const row = REPORT_TYPES.find((r) => r.id === effectiveType);
      if (row && 'plan_type' in row) {
        paramsObj.plan_type = row.plan_type;
      }
    }

    if (hasBypass && bypassToken) {
      void fetch('/api/onboard/record-bypass-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bypass: bypassToken,
          plan_type: paramsObj.plan_type ?? effectiveType,
          name: form.name,
          birth_date: form.birthDate,
          birth_time: form.birthTime,
          birth_city: form.birthCity,
        }),
      }).catch(() => {});
    }

    if (useCurrent) {
      paramsObj.currentCity = form.currentCity;
      paramsObj.currentLat  = String(form.currentLat);
      paramsObj.currentLng  = String(form.currentLng);
      if (form.currentTzOffset != null) {
        paramsObj.currentTz = String(form.currentTzOffset);
      }
    }

    if (hasBypass && bypassToken) {
      paramsObj.bypass = bypassToken;
    }

    const params = new URLSearchParams(paramsObj);

    const finalUrl = `/report/${crypto.randomUUID()}?${params.toString()}`;
    console.log('📍 Redirecting to:', finalUrl);
    console.log('📊 URL params:', {
      name: form.name,
      date: form.birthDate,
      time: form.birthTime,
      city: form.birthCity,
      lat: form.birthLat,
      lng: form.birthLng,
      type: form.reportType,
    });

    router.push(finalUrl);
  }

  function handleSubmit() {
    void goToReportGeneration();
  }

  function handleAdminFreeSubmit() {
    void goToReportGeneration({ forcePaidPlan: true });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const vars = slideVariants(dir);

  return (
    <main className="relative min-h-screen bg-space flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <StarField />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <MandalaRing className="w-[600px] h-[600px] text-amber" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {hasBypass && (
          <div className="mb-4 px-4 py-3 rounded-sm border border-emerald/40 bg-emerald/10 text-emerald font-mono text-xs tracking-wide text-center">
            ✓ Admin access — payment bypassed
          </div>
        )}
        {isAdmin && (
          <div className="mb-4 px-4 py-3 rounded-sm border border-emerald/30 bg-emerald/5 text-dust font-mono text-xs tracking-wide text-center">
            Admin account — use &quot;Generate Free Report (admin)&quot; on the last step for a full forecast without payment.
          </div>
        )}
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="font-display font-semibold text-xl tracking-[0.15em] text-star/70">
            JYOTISH AI
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 h-2 bg-amber'
                  : i < step
                  ? 'w-2 h-2 bg-amber/40'
                  : 'w-2 h-2 bg-horizon'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-cosmos border border-horizon rounded-sm p-8 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 && (
              <motion.div key="step1" initial={vars.initial} animate={vars.animate} exit={vars.exit}>
                <Step1 form={form} update={update} onNext={next} />
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="step2" initial={vars.initial} animate={vars.animate} exit={vars.exit}>
                <Step2
                  form={form}
                  update={update}
                  geo={geo}
                  geoLoading={geoLoading}
                  geoError={geoError}
                  onGeocode={geocodeCity}
                  currentGeo={currentGeo}
                  currentGeoLoading={currentGeoLoading}
                  currentGeoError={currentGeoError}
                  onNext={next}
                  onBack={back}
                />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="step3" initial={vars.initial} animate={vars.animate} exit={vars.exit}>
                <Step3
                  form={form}
                  setReportType={setReportType}
                  onSubmit={handleSubmit}
                  onAdminFreeSubmit={handleAdminFreeSubmit}
                  onBack={back}
                  promoCode={promoCode}
                  setPromoCode={setPromoCode}
                  promoDiscount={promoDiscount}
                  hasBypass={hasBypass}
                  isAdmin={isAdmin}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step counter */}
        <p className="text-center font-mono text-xs text-dust/40 mt-4 tracking-wider">
          {step + 1} / 3
        </p>
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-space/95 backdrop-blur-sm flex flex-col items-center justify-center z-50"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              className="mb-10"
            >
              <MandalaRing className="w-36 h-36 text-amber opacity-70" />
            </motion.div>

            <motion.p
              key={loadingStage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-body text-star text-lg mb-2 text-center"
            >
              {STAGES[loadingStage]}
            </motion.p>

            <p className="font-mono text-xs text-dust/60 tracking-wider mb-8">
              Stage {loadingStage + 1} of 3
            </p>

            <div className="w-56 h-[2px] bg-horizon rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-amber rounded-full"
                animate={{ width: `${((loadingStage + 1) / 3) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .cosmic-input {
          width: 100%;
          background: #080C18;
          border: 1px solid #1E2A4A;
          border-radius: 2px;
          padding: 10px 14px;
          font-family: var(--font-body), sans-serif;
          font-size: 14px;
          color: #E8EAF0;
          outline: none;
          transition: border-color 0.2s;
        }
        .cosmic-input::placeholder { color: #8892A4; }
        .cosmic-input:focus { border-color: rgba(245, 158, 11, 0.5); }
        .cosmic-input[type="date"],
        .cosmic-input[type="time"] { color-scheme: dark; }
      `}</style>
    </main>
  );
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-space flex items-center justify-center">
          <MandalaRing className="w-24 h-24 text-amber opacity-60" />
        </div>
      }
    >
      <OnboardPageInner />
    </Suspense>
  );
}
