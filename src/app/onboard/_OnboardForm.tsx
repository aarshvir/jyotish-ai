'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MandalaRing } from '@/components/ui/MandalaRing';
import { StarField } from '@/components/ui/StarField';
import { createClient } from '@/lib/supabase/client';
import { track } from '@/components/analytics/PostHogProvider';
import {
  readOnboardDraft as readDraft,
  writeOnboardDraft as writeDraft,
  clearOnboardDraft as clearDraft,
} from '@/lib/onboard/draft';
import { applyDiscount, formatAmount, type SupportedCurrency } from '@/lib/ziina/amounts';
import { estimateTimezoneOffsetMinutes } from '@/lib/utils/timezoneOffset';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportPlanId = 'free' | '7day' | 'monthly' | 'annual';

interface GeoPrice { amount: number; display: string; currency: string; }
interface GeoPrices { currency: string; prices: Record<string, GeoPrice>; }

interface FormData {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthLat: number | null;
  birthLng: number | null;
  /** UTC offset minutes for the birth city (from geocode) — used when timing at birth. */
  birthTzOffset: number | null;
  currentCity: string;
  currentLat: number | null;
  currentLng: number | null;
  currentTzOffset: number | null;
  reportType: ReportPlanId;
  forecastStartDate: string;
  personalContext: string;
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
  { label: 'About You', short: 'About', est: '30 sec' },
  { label: 'Birth Details', short: 'Birth', est: '1 min' },
  { label: 'Choose Plan', short: 'Plan', est: '30 sec' },
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
    description: '12-month outlook + 30-day hourly + PDF',
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
  // RFC-5322 simplified: local@domain.tld, no spaces, at least one dot in domain
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const isValidEmail = (email: string) => EMAIL_RE.test(email.trim());
  // Phone: digits, spaces, +, -, () allowed; require at least 7 digits.
  const phoneDigits = (p: string) => p.replace(/\D/g, '');
  const isValidPhone = (p: string) => phoneDigits(p).length >= 7;
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const emailInvalid = emailTouched && form.email.length > 0 && !isValidEmail(form.email);
  const nameInvalid = nameTouched && form.name.trim().length === 0;
  const phoneInvalid = phoneTouched && form.phone.length > 0 && !isValidPhone(form.phone);
  // Phone is optional — only validated when the user actually typed something.
  const canProceed = form.name.trim().length > 0 && isValidEmail(form.email) && (form.phone === '' || isValidPhone(form.phone));

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
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            onBlur={() => setNameTouched(true)}
            aria-invalid={nameInvalid || undefined}
            aria-describedby={nameInvalid ? 'onboard-name-err' : undefined}
            autoFocus
            required
          />
          {nameInvalid && (
            <p id="onboard-name-err" role="alert" className="text-caution text-xs mt-1.5">
              Please enter your name.
            </p>
          )}
        </Field>
        <Field label="Email Address" htmlFor="onboard-email" why="We send your report here. Never shared.">
          <input
            id="onboard-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className="cosmic-input"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            onBlur={() => setEmailTouched(true)}
            aria-invalid={emailInvalid || undefined}
            aria-describedby={emailInvalid ? 'onboard-email-err' : undefined}
            required
          />
          {emailInvalid && (
            <p id="onboard-email-err" role="alert" className="text-caution text-xs mt-1.5">
              That doesn&apos;t look like a valid email — check for typos.
            </p>
          )}
        </Field>
        <Field label="Phone Number" hint="Optional" htmlFor="onboard-phone" why="Optional — get your report link on WhatsApp when it's ready. Never shared.">
          <input
            id="onboard-phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className="cosmic-input"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            aria-invalid={phoneInvalid || undefined}
            aria-describedby={phoneInvalid ? 'onboard-phone-err' : undefined}
          />
          {phoneInvalid && (
            <p id="onboard-phone-err" role="alert" className="text-caution text-xs mt-1.5">
              Please enter a valid phone number with country code.
            </p>
          )}
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
            placeholder="City, Country (e.g. Mumbai, India)"
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
              placeholder="Your current city (or same as birth city)"
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

        <div className="pt-3 border-t border-horizon/30">
          <Field label="What's on your mind?" hint="Optional" htmlFor="onboard-personal-context"
                 why="Tell us what matters to you right now — goals, worries, or anything about your life. We use it to make your reading more specific to you.">
            <textarea
              id="onboard-personal-context"
              className="cosmic-input min-h-[88px] resize-y"
              rows={3}
              maxLength={1200}
              placeholder="e.g. I'm weighing a career change and worried about money and my relationship…"
              value={form.personalContext}
              onChange={(e) => update('personalContext', e.target.value.slice(0, 1200))}
            />
            <span className="mt-1 block font-mono text-mono-sm text-dust/40">{form.personalContext.length}/1200</span>
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
  isLoading: boolean;
  geoPrices: GeoPrices | null;
}

function Step3({
  form, setReportType, onSubmit, onAdminFreeSubmit, onBack,
  promoCode, setPromoCode, promoDiscount, hasBypass, isAdmin, isLoading, geoPrices,
}: Step3Props) {
  const paidPlan = form.reportType === '7day' || form.reportType === 'monthly' || form.reportType === 'annual';
  const fullPromo = paidPlan && promoDiscount >= 100;

  function getDiscountedDisplay(rt: typeof REPORT_TYPES[number]): { original: string; discounted: string | null } {
    if (rt.id === 'free') return { original: 'Free', discounted: null };
    const planId = rt.id;
    const geoEntry = geoPrices?.prices[planId];
    const original = geoEntry ? geoEntry.display : rt.defaultPrice;
    if (!promoDiscount || promoDiscount <= 0) return { original, discounted: null };
    if (promoDiscount >= 100) return { original, discounted: 'Free' };
    if (!geoEntry) return { original, discounted: null };
    // Same applyDiscount/formatAmount the create-intent route uses to set the Ziina
    // charge — one implementation, so the shown price IS the charged price.
    const currency = geoEntry.currency as SupportedCurrency;
    const discounted = formatAmount(applyDiscount(geoEntry.amount, promoDiscount, currency), currency);
    return { original, discounted };
  }

  return (
    <>
      <h1 className="font-body font-semibold text-star text-headline-lg mb-1.5">
        Choose Your Report
      </h1>
      <p className="font-body text-body-sm text-dust mb-7">
        One-time payment. Instant delivery. No subscriptions.
      </p>

      <div className="space-y-3 mb-6" role="radiogroup" aria-label="Report plan">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.id}
            type="button"
            role="radio"
            aria-checked={form.reportType === rt.id}
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
                {(() => {
                  const { original, discounted } = getDiscountedDisplay(rt);
                  return discounted ? (
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-mono text-xs text-dust/40 line-through">{original}</span>
                      <span className="font-mono text-mono-lg text-success">{discounted}</span>
                    </span>
                  ) : (
                    <span className="font-mono text-mono-lg text-amber">{original}</span>
                  );
                })()}
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

      {/* Launch offer nudge — shown only when no promo is active */}
      {paidPlan && !promoDiscount && (
        <div className="mb-4 px-3.5 py-2.5 rounded-button bg-amber/10 border border-amber/25 flex items-center gap-2.5">
          <span className="text-amber text-base shrink-0">🚀</span>
          <p className="font-mono text-mono-sm text-amber tracking-wide">
            Launch offer active — use code NEWUSER30 below for 30% off
          </p>
        </div>
      )}

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
            ✓ {promoDiscount}% off applied{fullPromo ? ' — no payment required' : ' — prices updated above'}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <button className="btn-secondary flex-1 py-3" onClick={onBack}>
            Back
          </button>
          <button className="btn-primary flex-[2] py-3" onClick={onSubmit} disabled={isLoading}>
            {hasBypass || fullPromo || !paidPlan
              ? 'Generate Report Free'
              : 'Continue to Payment →'}
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
              24-hour money-back guarantee · No questions asked
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
    name: '', email: '', phone: '',
    birthDate: '', birthTime: '', birthCity: '',
    birthLat: null, birthLng: null, birthTzOffset: null,
    currentCity: '', currentLat: null, currentLng: null, currentTzOffset: null,
    reportType: 'free',
    forecastStartDate: '',
    personalContext: '',
  });
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [currentGeo, setCurrentGeo] = useState<GeoResult | null>(null);
  const [currentGeoLoading, setCurrentGeoLoading] = useState(false);
  const [currentGeoError, setCurrentGeoError] = useState<string | null>(null);
  const checkoutInFlight = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const birthGeocodeAbort = useRef<AbortController | null>(null);
  const currentGeocodeAbort = useRef<AbortController | null>(null);
  const [hasBypass, setHasBypass] = useState(false);
  const [bypassToken, setBypassToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [geoPrices, setGeoPrices] = useState<GeoPrices | null>(null);
  const [paymentReturnBanner, setPaymentReturnBanner] = useState<{
    type: 'cancelled' | 'error' | 'failed' | 'pending';
    message: string;
  } | null>(null);
  // "Check payment status" for a pending Ziina payment — read-only, cannot double-charge.
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [checkCooldown, setCheckCooldown] = useState(0);

  const [promoDiscount, setPromoDiscount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        // First-time visitors from "Free Kundli" need the Sign Up tab + context, not a
        // bare Sign In wall. mode=signup pre-selects Sign Up; the login page also shows
        // free-Kundli framing when `next` points back to /onboard.
        router.replace(`/login?mode=signup&next=${encodeURIComponent('/onboard' + window.location.search)}`);
        return;
      }
      // Pre-fill form from saved profile defaults
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('display_name, email, default_birth_date, default_birth_time, default_birth_city')
        .eq('id', data.user.id)
        .maybeSingle();
      if (prof) {
        setForm(prev => ({
          ...prev,
          name: prev.name || prof.display_name || '',
          email: prev.email || prof.email || data.user.email || '',
          birthDate: prev.birthDate || prof.default_birth_date || '',
          birthTime: prev.birthTime || prof.default_birth_time || '',
          birthCity: prev.birthCity || prof.default_birth_city || '',
        }));
      } else {
        // At minimum fill email from auth
        setForm(prev => ({ ...prev, email: prev.email || data.user.email || '' }));
      }
    });
  }, [router]);

  // Restore a saved draft on plain mount too (e.g. user navigated back, or returned without
  // the ?payment= param). Only fills fields that are still empty, so profile pre-fill / typed
  // values always win. The payment-return effect handles the banner + step jump.
  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;
    setForm((prev) => {
      const isEmpty = !prev.name && !prev.birthDate && !prev.birthTime && !prev.birthCity;
      if (!isEmpty) return prev;
      return {
        ...prev,
        name: prev.name || draft.name || '',
        birthDate: prev.birthDate || draft.birthDate || '',
        birthTime: prev.birthTime || draft.birthTime || '',
        birthCity: prev.birthCity || draft.birthCity || '',
        birthLat: prev.birthLat ?? draft.birthLat ?? prev.birthLat,
        birthLng: prev.birthLng ?? draft.birthLng ?? prev.birthLng,
        reportType: draft.reportType || prev.reportType,
      };
    });
    if (draft.promoCode) setPromoCode((prev) => prev || draft.promoCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan === 'preview') {
      setForm((prev) => ({ ...prev, reportType: 'free' }));
    } else if (plan === '7day' || plan === 'monthly' || plan === 'annual' || plan === 'free') {
      setForm((prev) => ({ ...prev, reportType: plan }));
    }
  }, [searchParams]);

  // Fetch and validate promo code any time it changes (with a small debounce)
  useEffect(() => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoDiscount(0);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/promo/validate?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data && data.valid && typeof data.discountPct === 'number') {
          setPromoDiscount(data.discountPct);
        } else {
          setPromoDiscount(0);
        }
      } catch {
        setPromoDiscount(0);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [promoCode]);

  // Auto-apply promo code from URL (?promo=CODE)
  useEffect(() => {
    const urlPromo = searchParams.get('promo');
    if (!urlPromo) return;
    const normalized = urlPromo.trim().toUpperCase();
    if (normalized) {
      setPromoCode((prev) => prev || normalized);
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

  // Handle return from Ziina payment (cancelled, failed, error, incomplete, pending)
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (!payment) return;

    // Restore the birth-detail draft stashed before the Ziina redirect, so a cancelled /
    // declined payment lands the user back on their filled-in form (React state was wiped
    // by the full-page redirect). Only fill fields that are currently empty.
    const failedOrCancelled = payment === 'cancelled' || payment === 'failed' || payment === 'error' || payment === 'pending' || payment === 'incomplete';
    let restored = false;
    if (failedOrCancelled) {
      const draft = readDraft();
      if (draft) {
        setForm((prev) => ({
          ...prev,
          name: prev.name || draft.name || '',
          birthDate: prev.birthDate || draft.birthDate || '',
          birthTime: prev.birthTime || draft.birthTime || '',
          birthCity: prev.birthCity || draft.birthCity || '',
          birthLat: prev.birthLat ?? draft.birthLat ?? prev.birthLat,
          birthLng: prev.birthLng ?? draft.birthLng ?? prev.birthLng,
          reportType: draft.reportType || prev.reportType,
        }));
        if (draft.promoCode) setPromoCode((prev) => prev || draft.promoCode);
        restored = true;
      }
    }
    const savedNote = restored ? ' Your details are saved below — just try again.' : '';

    if (payment === 'cancelled') {
      setPaymentReturnBanner({ type: 'cancelled', message: `Your payment didn't complete — nothing was charged.${savedNote || ' Select a plan below to try again.'}` });
    } else if (payment === 'failed') {
      setPaymentReturnBanner({ type: 'failed', message: `Payment failed — nothing was charged.${savedNote} Please try again or use a different card.` });
    } else if (payment === 'error') {
      setPaymentReturnBanner({ type: 'error', message: `Something went wrong with payment — nothing was charged.${savedNote} Please try again.` });
    } else if (payment === 'pending' || payment === 'incomplete') {
      setPaymentReturnBanner({ type: 'pending', message: `Payment is still processing — you have not been charged twice.${savedNote} Use "Check payment status" below, or wait a moment before trying again.` });
    }

    // Jump to plan selection step (step 2) if we have a prior session so user skips re-entry.
    try {
      const storedReportId = typeof window !== 'undefined' ? sessionStorage.getItem('ziina_report_id') : null;
      if ((storedReportId || restored) && payment !== 'pending' && payment !== 'incomplete') {
        setStep(2);
      }
    } catch { /* sessionStorage may be unavailable */ }
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

  // Fire a funnel event whenever the visible onboarding step changes (fire-and-forget).
  useEffect(() => {
    track('onboard_step', { step });
  }, [step]);

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function next() { setDir(1); setStep((s) => s + 1); }
  function back() { setDir(-1); setStep((s) => s - 1); }

  function setReportType(id: ReportPlanId) {
    setForm((prev) => ({ ...prev, reportType: id }));
    track('plan_selected', { plan: id });
  }

  // Tick down the "Check payment status" cooldown so users can't hammer the poll.
  useEffect(() => {
    if (checkCooldown <= 0) return;
    const t = setTimeout(() => setCheckCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [checkCooldown]);

  // Re-check a pending payment by reading the draft report's status (read-only — never
  // creates a new intent, so it cannot double-charge). If the payment landed, the row
  // will have left 'pending'; send the user to their report.
  async function checkPaymentStatus() {
    if (checkingPayment || checkCooldown > 0) return;
    let reportId: string | null = null;
    try { reportId = sessionStorage.getItem('ziina_report_id'); } catch { /* unavailable */ }
    if (!reportId) {
      setPaymentReturnBanner({ type: 'error', message: 'We could not find that payment to check. Please select a plan below and try again — you have not been charged.' });
      return;
    }
    setCheckingPayment(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/status`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json().catch(() => ({})) as { status?: string };
      if (res.ok && data.status && data.status !== 'pending' && data.status !== 'unknown') {
        // Payment confirmed server-side (report left the 'pending' draft state).
        clearDraft();
        router.push(`/report/${reportId}?payment_status=paid`);
        return;
      }
      setPaymentReturnBanner({ type: 'pending', message: 'Still processing — no charge has gone through twice. Give it a few more seconds, then check again.' });
    } catch {
      setPaymentReturnBanner({ type: 'pending', message: 'Could not reach the server just now. Please try checking again in a moment — you have not been charged twice.' });
    } finally {
      setCheckingPayment(false);
      setCheckCooldown(8);
    }
  }

  async function geocodeCity(city: string, isCurrent = false) {
    if (!city.trim()) return;
    const abortRef = isCurrent ? currentGeocodeAbort : birthGeocodeAbort;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    if (isCurrent) { setCurrentGeoLoading(true); setCurrentGeoError(null); setCurrentGeo(null); }
    else { setGeoLoading(true); setGeoError(null); setGeo(null); }

    try {
      const res = await fetch(`/api/geocode?city=${encodeURIComponent(city)}`, { signal });
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
        const tzOffset =
          estimateTimezoneOffsetMinutes({ city: `${name} ${city}`, lng }) ?? 0;
        const geoResult: GeoResult = { display: name, lat, lng, tzOffset };
        if (isCurrent) {
          setCurrentGeo(geoResult);
          setForm((prev) => ({ ...prev, currentLat: lat, currentLng: lng, currentTzOffset: tzOffset }));
        } else {
          setGeo(geoResult);
          setForm((prev) => ({ ...prev, birthLat: lat, birthLng: lng, birthTzOffset: tzOffset }));
        }
      } else {
        const err = 'City not found. Try a different spelling.';
        if (isCurrent) setCurrentGeoError(err); else setGeoError(err);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = 'Location lookup failed. You can continue without it.';
      if (isCurrent) setCurrentGeoError(msg); else setGeoError(msg);
    } finally {
      if (isCurrent) setCurrentGeoLoading(false); else setGeoLoading(false);
    }
  }

  async function goToReportGeneration(opts?: { forcePaidPlan?: boolean; adminFree?: boolean }) {
    if (checkoutInFlight.current) return;
    checkoutInFlight.current = true;
    // Gate: refuse to dispatch a report when geocoding did not resolve.
    // Falling back to 0,0 silently produces a chart anchored near the Gulf of
    // Guinea, which contradicts the marketing promise of "sub-degree precision".
    if (form.birthLat == null || form.birthLng == null) {
      // Geocoding otherwise only fires on blur, so a prefilled (returning-user) city can reach
      // here unresolved. Auto-resolve it now so the user can simply retry instead of re-typing.
      if (form.birthCity.trim()) void geocodeCity(form.birthCity);
      setPaymentReturnBanner({
        type: 'error',
        message: `We're pinning "${form.birthCity || 'your birth city'}" to a precise location — give it a moment, then tap continue again. If it persists, add the country (e.g. "Lucknow, India").`,
      });
      setStep(1);
      checkoutInFlight.current = false;
      return;
    }

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
          birth_lat: form.birthLat,
          birth_lng: form.birthLng,
        }),
      });
    } catch (err) {
      console.error('Ephemeris API call failed (non-blocking):', err);
    } finally {
      clearInterval(stageTimer.current!);
    }

    // Require current city to genuinely DIFFER from birth city (matches the success-badge
    // condition). Otherwise, if the user typed a different city, geocoded it, then edited
    // the field back to the birth city, the stale coords would be used for the wrong place.
    const useCurrent =
      form.currentCity.trim() &&
      form.currentCity.trim() !== form.birthCity.trim() &&
      form.currentLat != null &&
      form.currentLng != null;
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
          name: form.name, phone: form.phone, birth_date: form.birthDate, birth_time: form.birthTime, birth_city: form.birthCity,
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
    // adminFree: the admin "Generate Free Report" button wants a full paid-tier report
    // without payment. /api/reports/start authorizes admins for free generation, so skip
    // the Ziina popup here (the server still enforces actual admin — a non-admin who
    // forged this flag would not be granted a free paid report).
    const needsPayment = isPaidPlan && !hasBypass && !opts?.adminFree && promoDiscount < 100;
    const params = new URLSearchParams(paramsObj);
    if (needsPayment) params.set('payment_status', 'paid');
    const finalUrl = `/report/${reportId}?${params.toString()}`;

    if (needsPayment) {
      try {
        // Honour the user's manual currency pick (set by <CurrencySwitcher />)
        // if it exists, so checkout matches what they saw on the pricing card.
        let preferredCurrency: string | null = null;
        try {
          preferredCurrency = typeof window !== 'undefined'
            ? window.localStorage.getItem('vh_currency')
            : null;
        } catch { /* private mode — fall back to cookie/geo */ }
        // Send birth data so the server persists a paid report DRAFT row before
        // checkout — guarantees a row exists to generate after Ziina returns.
        const rawTimePaid = form.birthTime;
        const birthTimeNormPaid =
          rawTimePaid && rawTimePaid.includes(':') && rawTimePaid.split(':').length === 2
            ? `${rawTimePaid}:00`
            : rawTimePaid || '12:00:00';
        // Time grids follow the timed location (current city if set, else birth city).
        // Never fall back to the browser TZ — that silently shifts every hourly window.
        const tzForPaid = useCurrent
          ? (form.currentTzOffset ?? form.birthTzOffset ?? 0)
          : (form.birthTzOffset ??
              estimateTimezoneOffsetMinutes({ city: form.birthCity, lng: form.birthLng }) ??
              0);
        const intentRes = await fetch('/api/ziina/create-intent', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({
            planType: effectiveType,
            reportId,
            promoCode: promoCode || undefined,
            ...(preferredCurrency ? { currency: preferredCurrency } : {}),
            name: form.name,
            phone: form.phone,
            birth_date: form.birthDate,
            birth_time: birthTimeNormPaid,
            birth_city: form.birthCity,
            birth_lat: form.birthLat,
            birth_lng: form.birthLng,
            timezone_offset: tzForPaid,
            ...(useCurrent ? {
              current_city: form.currentCity,
              current_lat: form.currentLat,
              current_lng: form.currentLng,
            } : {}),
            ...(form.forecastStartDate ? { forecast_start: form.forecastStartDate } : {}),
            ...(form.personalContext.trim() ? { personal_context: form.personalContext.trim() } : {}),
          }),
        });
        if (!intentRes.ok) {
          const errBody = await intentRes.json().catch(() => ({})) as { error?: string };
          const errMsg = errBody.error ?? `Payment setup failed (${intentRes.status}). Please try again or contact support@vedichour.com.`;
          setPaymentReturnBanner({ type: 'error', message: errMsg });
          setIsLoading(false);
          checkoutInFlight.current = false;
          // Scroll the user back to the top so they see the banner
          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const intent = await intentRes.json() as { intentId?: string; redirectUrl?: string };
        if (!intent.redirectUrl) throw new Error('No redirect URL from Ziina');

        // Store the final report URL in sessionStorage so we can resume after payment redirect
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('ziina_report_url', finalUrl);
            sessionStorage.setItem('ziina_report_id', reportId);
          } catch { /* storage unavailable (private mode/quota) — redirect proceeds */ }
        }
        // Persist a form draft so a cancelled/declined Ziina payment restores the details
        // instead of a blank form on return.
        writeDraft({
          name: form.name,
          birthDate: form.birthDate,
          birthTime: form.birthTime,
          birthCity: form.birthCity,
          birthLat: form.birthLat,
          birthLng: form.birthLng,
          reportType: effectiveType,
          promoCode,
        });

        // Conversion event: fired fire-and-forget just before leaving for Ziina.
        track('checkout_started', { plan: effectiveType, product: 'forecast' });

        // Redirect user to Ziina's hosted payment page
        // (sessionStorage cleared on successful report page load — see report/[id]/page.tsx)
        window.location.href = intent.redirectUrl;
        return;
      } catch (err) {
        console.error('Payment checkout failed:', err);
        setPaymentReturnBanner({
          type: 'error',
          message: 'Payment setup failed. Please try again or contact support@vedichour.com.',
        });
        setIsLoading(false);
        checkoutInFlight.current = false;
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Free plan or 100% promo (e.g. ADMIN100) — payment skipped.
    // We must call /api/reports/start to create the DB row and trigger the Inngest pipeline.
    // Field names MUST match /api/reports/start (same as report/[id] kickOffBackgroundGeneration).
    try {
      const rawTime = form.birthTime;
      const birthTimeNorm =
        rawTime && rawTime.includes(':') && rawTime.split(':').length === 2
          ? `${rawTime}:00`
          : rawTime || '12:00:00';
      const tzForStart = useCurrent
        ? (form.currentTzOffset ?? form.birthTzOffset ?? 0)
        : (form.birthTzOffset ??
            estimateTimezoneOffsetMinutes({ city: form.birthCity, lng: form.birthLng }) ??
            0);

      const startPayload: Record<string, unknown> = {
        reportId,
        name: form.name,
        phone: form.phone,
        birth_date: form.birthDate,
        birth_time: birthTimeNorm,
        // Store the true birth city (not the "Current (born: X)" display string) — mirrors the paid path.
        birth_city: form.birthCity,
        // Non-null asserted: the gate at the top of goToReportGeneration() refuses
        // to proceed without resolved coordinates.
        birth_lat: form.birthLat as number,
        birth_lng: form.birthLng as number,
        type: effectiveType,
        plan_type: paramsObj.plan_type ?? effectiveType,
        payment_status: isPaidPlan ? 'promo' : 'free',
        timezone_offset: tzForStart,
        ...(form.forecastStartDate ? { forecast_start: form.forecastStartDate } : {}),
        ...(form.personalContext.trim() ? { personal_context: form.personalContext.trim() } : {}),
        ...(useCurrent ? {
          current_city: form.currentCity,
          current_lat: form.currentLat ?? 0,
          current_lng: form.currentLng ?? 0,
        } : {}),
        ...(promoCode ? { promoCode } : {}),
      };
      const startRes = await fetch('/api/reports/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(startPayload),
      });
      if (!startRes.ok) {
        const errBody = await startRes.json().catch(() => ({})) as { error?: string; code?: string };
        console.error('Report start failed:', errBody.error);
        setPaymentReturnBanner({
          type: 'error',
          message:
            errBody.code === 'INNGEST_DISPATCH_FAILED'
              ? 'Background queue unavailable, please retry in a minute'
              : (errBody.error ?? 'Failed to start report generation. Please try again.'),
        });
        setIsLoading(false);
        checkoutInFlight.current = false;
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } catch (err) {
      console.error('Report start network error:', err);
      // Non-fatal: navigate anyway; the report page will detect missing state and retry
    }

    // Report row created — the draft has served its purpose; drop it so a later visit starts clean.
    clearDraft();
    router.push(finalUrl);
  }

  function handleSubmit() { void goToReportGeneration(); }
  function handleAdminFreeSubmit() { void goToReportGeneration({ forcePaidPlan: true, adminFree: true }); }

  const vars = slideVariants(dir);

  return (
    <main id="main-content" className="relative min-h-screen bg-space flex flex-col items-center justify-center px-4 py-10 md:py-14 overflow-hidden">
      <StarField />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
        <MandalaRing className="w-[500px] h-[500px] text-amber" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {paymentReturnBanner && (
          <div
            role="alert"
            aria-live="assertive"
            className={`mb-4 px-4 py-3 rounded-card border font-body text-sm flex items-start gap-3 ${
            paymentReturnBanner.type === 'cancelled'
              ? 'border-amber/30 bg-amber/10 text-amber'
              : paymentReturnBanner.type === 'pending'
              ? 'border-caution/30 bg-caution/10 text-caution'
              : 'border-error/30 bg-error/10 text-error'
          }`}>
            <span className="shrink-0 mt-0.5">
              {paymentReturnBanner.type === 'cancelled' ? '↩' : paymentReturnBanner.type === 'pending' ? '⏳' : '✕'}
            </span>
            <div className="flex-1">
              <span>{paymentReturnBanner.message}</span>
              {paymentReturnBanner.type === 'pending' && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => void checkPaymentStatus()}
                    disabled={checkingPayment || checkCooldown > 0}
                    className="font-mono text-mono-sm px-3 py-1.5 rounded-button border border-caution/40 text-caution hover:bg-caution/10 transition-colors disabled:opacity-50"
                  >
                    {checkingPayment
                      ? 'Checking…'
                      : checkCooldown > 0
                      ? `Check again in ${checkCooldown}s`
                      : 'Check payment status'}
                  </button>
                  <p className="font-mono text-[11px] text-caution/60 mt-1.5">Checking is safe — it won&apos;t charge you again.</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setPaymentReturnBanner(null)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >✕</button>
          </div>
        )}
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
                <span className={`font-body text-[11px] sm:hidden ${
                  i === step ? 'text-star font-medium' : 'text-dust/50'
                }`}>
                  {meta.short}
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
                  hasBypass={hasBypass} isAdmin={isAdmin} isLoading={isLoading} geoPrices={geoPrices}
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

export default function OnboardForm() {
  return (
    <Suspense fallback={null}>
      <OnboardPageInner />
    </Suspense>
  );
}
