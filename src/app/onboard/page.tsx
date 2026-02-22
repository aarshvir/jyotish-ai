'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MandalaRing } from '@/components/ui/MandalaRing';
import { StarField } from '@/components/ui/StarField';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  email: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthLat: number | null;
  birthLng: number | null;
  reportType: 'free' | '7day' | 'monthly';
}

interface GeoResult {
  display: string;
  lat: number;
  lng: number;
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
    title: '7-Day Forecast',
    price: '$4.99',
    description: 'Hourly ratings + AI narrative for 7 days',
  },
  {
    id: 'monthly' as const,
    title: 'Monthly Oracle',
    price: '$19.99',
    description: '30-day calendar + nativity analysis + PDF',
  },
];

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
  onGeocode: (city: string) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step2({ form, update, geo, geoLoading, geoError, onGeocode, onNext, onBack }: Step2Props) {
  return (
    <>
      <h1 className="font-display font-semibold text-star mb-2"
          style={{ fontSize: 'clamp(28px, 3.5vw, 44px)' }}>
        When and Where Did You Arrive?
      </h1>
      <p className="font-body text-dust text-sm mb-8">
        Exact birth time gives precise Lagna.
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

        <Field label="Birth City" hint="City, Country">
          <input
            type="text"
            className="cosmic-input"
            placeholder="Lucknow, India"
            value={form.birthCity}
            onChange={(e) => {
              update('birthCity', e.target.value);
            }}
            onBlur={(e) => onGeocode(e.target.value)}
            required
          />
        </Field>

        {geoLoading && (
          <p className="font-mono text-xs text-amber/60 animate-pulse tracking-wide">
            Locating coordinates…
          </p>
        )}
        {geoError && !geoLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-crimson/10 border border-crimson/20"
          >
            <span className="text-crimson text-sm">⚠</span>
            <span className="font-mono text-xs text-crimson tracking-wide">
              {geoError}
            </span>
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
  setReportType: (id: 'free' | '7day' | 'monthly') => void;
  onSubmit: () => void;
  onBack: () => void;
}

function Step3({ form, setReportType, onSubmit, onBack }: Step3Props) {
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
            <div className="flex items-center justify-between mb-1">
              <span className="font-display font-semibold text-lg">{rt.title}</span>
              <span className="font-mono text-sm text-amber">{rt.price}</span>
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

      <div className="space-y-4">
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
            Generate Report
          </button>
        </div>

        {/* Money-back guarantee for paid plans */}
        {(form.reportType === '7day' || form.reportType === 'monthly') && (
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

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir]   = useState<1 | -1>(1);
  const [form, setForm] = useState<FormData>({
    name: '', email: '',
    birthDate: '', birthTime: '', birthCity: '',
    birthLat: null, birthLng: null,
    reportType: 'free',
  });
  const [geo, setGeo]               = useState<GeoResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError]     = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for ?plan= URL param and pre-select report type
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const plan = params.get('plan');
      if (plan === '7day' || plan === 'monthly' || plan === 'free') {
        setForm((prev) => ({ ...prev, reportType: plan }));
      }
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function next() { setDir(1);  setStep((s) => s + 1); }
  function back() { setDir(-1); setStep((s) => s - 1); }

  function setReportType(id: 'free' | '7day' | 'monthly') {
    setForm((prev) => ({ ...prev, reportType: id }));
  }

  async function geocodeCity(city: string) {
    if (!city.trim()) return;
    setGeoLoading(true);
    setGeoError(null);
    setGeo(null);
    
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      
      if (!res.ok) {
        setGeoError('Location lookup failed. You can continue without it.');
        return;
      }
      
      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
      
      if (data[0]) {
        const lat  = parseFloat(data[0].lat);
        const lng  = parseFloat(data[0].lon);
        const name = data[0].display_name.split(',').slice(0, 3).join(',').trim();
        setGeo({ display: name, lat, lng });
        setForm((prev) => ({ ...prev, birthLat: lat, birthLng: lng }));
        console.log('✅ Geocoded:', { city, lat, lng, display: name });
      } else {
        setGeoError('City not found. Try a different spelling.');
        console.warn('⚠️ No geocoding results for:', city);
      }
    } catch (err) {
      setGeoError('Location lookup failed. You can continue without it.');
      console.error('❌ Geocoding error:', err);
    } finally {
      setGeoLoading(false);
    }
  }

  async function handleSubmit() {
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

    const params = new URLSearchParams({
      name: form.name,
      date: form.birthDate,
      time: form.birthTime,
      city: form.birthCity,
      lat:  String(form.birthLat ?? ''),
      lng:  String(form.birthLng ?? ''),
      type: form.reportType,
    });

    const finalUrl = `/report/${Date.now()}?${params.toString()}`;
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const vars = slideVariants(dir);

  return (
    <main className="relative min-h-screen bg-space flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <StarField />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <MandalaRing className="w-[600px] h-[600px] text-amber" />
      </div>

      <div className="relative z-10 w-full max-w-md">
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
                  onBack={back}
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
