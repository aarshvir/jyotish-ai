'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { track } from '@/components/analytics/PostHogProvider';
import { DeliveryGate } from '@/components/onboard/DeliveryGate';
import { PaymentHandoff } from '@/components/checkout/PaymentHandoff';
import { formatAmount } from '@/lib/ziina/amounts';
import type { Answers, Step } from '@/lib/quiz/questions';
import {
  concernHeadline,
  firstStepId,
  getStep,
  nextStepId,
  prevStepId,
  progress,
  stepPosition,
  timeConfidence,
  validate,
} from '@/lib/quiz/engine';
import { personalContextFrom } from '@/lib/quiz/personalContext';
import { loadQuiz, saveQuiz } from '@/lib/quiz/persist';

/**
 * /start — the only way into a report now (owner, 2026-09-13):
 * quiz → required sign-up → real chart facts → recap → subscription paywall → Ziina.
 *
 * The question graph and branching live in lib/quiz (pure, tested). This file only
 * renders a step, collects an answer, and hands off to checkout.
 */

const PAYWALL = 'paywall';
type SubPlan = 'sub_monthly' | 'sub_annual';
type Currency = 'INR' | 'USD' | 'AED';

interface ChartFacts {
  lagna: string | null;
  moonSign: string | null;
  nakshatra: string | null;
  period: string | null;
  periodEnds: string | null;
}

interface Prices {
  currency: Currency;
  monthly: string;
  annual: string;
}

const MIN_COMPUTE_MS = 1200;
const LINE_MS = 900;

function birthTimeFor(a: Answers): string {
  const t = typeof a.birth_time === 'string' ? a.birth_time : '';
  return timeConfidence(a) !== 'unknown' && /^\d{2}:\d{2}$/.test(t) ? `${t}:00` : '12:00:00';
}

function num(v: unknown): number | undefined {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * "Jaipur, Jaipur Municipal Corporation, Jaipur Tehsil, Jaipur, Rajasthan, 302001, India"
 * → "Jaipur, Rajasthan, India". Town, state and country: enough to tell two same-named
 * towns apart in the picker, short enough to read on a phone. Postcodes are dropped.
 */
function shortPlace(display: string): string {
  const parts = display
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !/^\d[\d\s-]*$/.test(p));
  if (parts.length <= 3) return parts.join(', ');
  return `${parts[0]}, ${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
}

function formatMonthYear(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

async function fetchChart(a: Answers): Promise<ChartFacts | null> {
  const lat = num(a.birth_city_lat);
  const lng = num(a.birth_city_lng);
  if (typeof a.birth_date !== 'string' || lat === undefined || lng === undefined) return null;
  try {
    const r = await fetch('/api/tools/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        person: { birth_date: a.birth_date, birth_time: birthTimeFor(a), birth_city: a.birth_city, birth_lat: lat, birth_lng: lng },
      }),
    });
    if (!r.ok) return null;
    const c = (await r.json()) as {
      lagna?: string | null;
      moon_sign?: string | null;
      moon_nakshatra?: string | null;
      current_dasha?: { mahadasha?: string; antardasha?: string; end_date?: string } | null;
    };
    const cd = c.current_dasha ?? null;
    return {
      lagna: c.lagna ?? null,
      moonSign: c.moon_sign ?? null,
      nakshatra: c.moon_nakshatra ?? null,
      period: cd?.mahadasha ? (cd.antardasha ? `${cd.mahadasha}–${cd.antardasha}` : cd.mahadasha) : null,
      periodEnds: cd?.end_date ?? null,
    };
  } catch {
    return null;
  }
}

const CHECKOUT_REPORT_KEY = 'vh_checkout_report_v1';
const CHECKOUT_REPORT_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * One draft report per checkout attempt. Reusing it across a double tap, a retry or the
 * back button from Ziina lets create-intent hand back the same pending payment instead of
 * opening a second one the buyer could pay twice.
 */
function checkoutReportId(): string {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_REPORT_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { id?: unknown; at?: unknown };
      if (typeof saved.id === 'string' && typeof saved.at === 'number' && Date.now() - saved.at < CHECKOUT_REPORT_MAX_AGE_MS) {
        return saved.id;
      }
    }
    const id = crypto.randomUUID();
    sessionStorage.setItem(CHECKOUT_REPORT_KEY, JSON.stringify({ id, at: Date.now() }));
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function goToGrantedReport(reportId: string) {
  try {
    sessionStorage.removeItem(CHECKOUT_REPORT_KEY);
  } catch {
    /* ignore */
  }
  window.location.href = `/report/${reportId}?payment_status=paid&subscribed=1`;
}

function checkoutBody(a: Answers, planType: SubPlan, reportId: string) {
  const currentLat = num(a.current_city_lat);
  const currentLng = num(a.current_city_lng);
  const hasCurrent = typeof a.current_city === 'string' && a.current_city.trim() !== '' && currentLat !== undefined;
  return {
    planType,
    reportId,
    name: typeof a.first_name === 'string' ? a.first_name.trim() : '',
    birth_date: a.birth_date,
    birth_time: birthTimeFor(a),
    birth_city: a.birth_city,
    birth_lat: num(a.birth_city_lat),
    birth_lng: num(a.birth_city_lng),
    ...(hasCurrent ? { current_city: a.current_city, current_lat: currentLat, current_lng: currentLng } : {}),
    // A renewal carries the brief from the previous report when no new quiz answers were given.
    personal_context: personalContextFrom(a) || (typeof a.renew_context === 'string' ? a.renew_context : ''),
  };
}

/** Pre-fill from the subscriber's latest report so renewing never asks for birth details again. */
function answersFromReport(r: Record<string, unknown>): Answers {
  const a: Answers = {};
  const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : '');
  if (str('native_name')) a.first_name = str('native_name');
  if (str('birth_date')) a.birth_date = str('birth_date');
  const hhmm = str('birth_time').slice(0, 5);
  // 12:00 is what older checkouts stored when no time was given, so it is not trusted.
  if (/^\d{2}:\d{2}$/.test(hhmm) && hhmm !== '12:00') {
    a.birth_time_known = 'exact';
    a.birth_time = hhmm;
  } else {
    a.birth_time_known = 'unknown';
  }
  if (str('birth_city') && r.birth_lat != null && r.birth_lng != null) {
    a.birth_city = str('birth_city');
    a.birth_city_lat = String(r.birth_lat);
    a.birth_city_lng = String(r.birth_lng);
  }
  if (str('current_city') && r.current_lat != null && r.current_lng != null) {
    a.current_city = str('current_city');
    a.current_city_lat = String(r.current_lat);
    a.current_city_lng = String(r.current_lng);
  }
  if (str('personal_context')) a.renew_context = str('personal_context');
  return a;
}

export function StartQuiz() {
  const params = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [stepId, setStepId] = useState<string>(firstStepId());
  const [floor, setFloor] = useState(0);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [chart, setChart] = useState<ChartFacts | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [computeLine, setComputeLine] = useState(0);
  const [prices, setPrices] = useState<Prices | null>(null);
  const [plan, setPlan] = useState<SubPlan>('sub_monthly');
  const [paying, setPaying] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<{ priceDisplay: string; redirectUrl: string; currency: Currency } | null>(null);
  const [activeUntil, setActiveUntil] = useState<string | null>(null);
  const [renewing, setRenewing] = useState(false);
  const computing = useRef(false);

  const step: Step | undefined = stepId === PAYWALL ? undefined : getStep(stepId);

  // Restore progress (Google sign-in and failed payments are full-page round trips),
  // learn who is signed in, and fetch this visitor's prices.
  useEffect(() => {
    const saved = loadQuiz();
    const payment = params.get('payment');
    if (saved) {
      setAnswers(saved.answers);
      setStepId(payment ? PAYWALL : saved.stepId);
    }
    if (payment) {
      setBanner(
        payment === 'pending'
          ? 'Your payment is still being confirmed. Keep this page open — it takes you to your forecast the moment Ziina confirms. You will not be charged twice.'
          : 'The payment did not go through, and nothing was charged. You can try again below.',
      );
    }
    // Renewal (from the dashboard or a reminder): skip the quiz and go straight to the plans,
    // with birth details taken from the latest report.
    if (params.get('renew') === '1') {
      setRenewing(true);
      fetch('/api/subscription/status', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { latestReport?: Record<string, unknown> | null } | null) => {
          if (j?.latestReport) {
            setAnswers((prev) => ({ ...prev, ...answersFromReport(j.latestReport!) }));
            setStepId(PAYWALL);
          }
        })
        .catch(() => {
          /* falls back to the normal quiz */
        });
    }
    setHydrated(true);

    const sb = createClient();
    void sb.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: authSub } = sb.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));

    fetch('/api/geo', { cache: 'no-store' })
      .then((r) => r.json())
      .then((g: { currency?: string; prices?: Record<string, unknown> }) => {
        const currency: Currency = g.currency === 'INR' || g.currency === 'AED' ? g.currency : 'USD';
        // /api/geo returns each price as { amount, display, currency }. Rendering that object
        // directly crashed the paywall (caught by the end-to-end run), so read .display.
        const display = (v: unknown): string | undefined => {
          if (typeof v === 'string') return v;
          if (v && typeof v === 'object' && typeof (v as { display?: unknown }).display === 'string') {
            return (v as { display: string }).display;
          }
          return undefined;
        };
        const monthly = display(g.prices?.sub_monthly);
        const annual = display(g.prices?.sub_annual);
        if (monthly && annual) setPrices({ currency, monthly, annual });
      })
      .catch(() => {
        /* prices render once available; checkout still charges the server-side amount */
      });

    return () => authSub.subscription.unsubscribe();
  }, [params]);

  useEffect(() => {
    if (!signedIn) return;
    fetch('/api/subscription/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { subscription?: { active?: boolean; currentPeriodEnd?: string } | null; grantedReportId?: string | null } | null) => {
        // This request just granted a payment that had not landed (tab closed, late confirmation).
        if (j?.grantedReportId) {
          goToGrantedReport(j.grantedReportId);
          return;
        }
        const s = j?.subscription;
        setActiveUntil(s?.active && s.currentPeriodEnd ? s.currentPeriodEnd : null);
      })
      .catch(() => {});
  }, [signedIn]);

  // Ziina sends this plan no webhooks, so a payment that had not confirmed when the buyer
  // came back is re-checked here. /api/subscription/status asks Ziina about this visitor's
  // own recent payments and grants any that completed. Gives up after about three minutes.
  useEffect(() => {
    if (!signedIn) return;
    const payment = params.get('payment');
    if (payment !== 'pending' && payment !== 'error') return;
    let tries = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (stopped) return;
      tries += 1;
      try {
        const r = await fetch('/api/subscription/status', { cache: 'no-store' });
        const j = r.ok ? ((await r.json()) as { grantedReportId?: string | null }) : null;
        if (j?.grantedReportId) {
          goToGrantedReport(j.grantedReportId);
          return;
        }
      } catch {
        /* try again on the next tick */
      }
      if (!stopped && tries < 36) timer = setTimeout(poll, 5000);
    };
    timer = setTimeout(poll, 5000);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [signedIn, params]);

  useEffect(() => {
    if (hydrated) saveQuiz(answers, stepId);
  }, [answers, stepId, hydrated]);

  // Load the stored answer into the input buffer whenever the step changes.
  useEffect(() => {
    setError(null);
    const current = stepId === PAYWALL ? undefined : getStep(stepId);
    const v = current && 'field' in current ? answers[current.field] : undefined;
    setDraft(typeof v === 'string' ? v : '');
    track(stepId === PAYWALL ? 'paywall_view' : 'quiz_step', { step: stepId });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  const advance = useCallback(
    (nextAnswers: Answers) => {
      const next = nextStepId(stepId, nextAnswers);
      if (!next) {
        setStepId(PAYWALL);
        return;
      }
      setFloor((f) => progress(next, nextAnswers, f));
      setStepId(next);
    },
    [stepId],
  );

  function back() {
    if (stepId === PAYWALL) {
      setStepId('recap');
      return;
    }
    const prev = prevStepId(stepId, answers);
    // Never step back into the loader — it would re-run with nothing new to show.
    if (prev === 'compute') setStepId(prevStepId('compute', answers) ?? firstStepId());
    else if (prev) setStepId(prev);
  }

  // Sign-up is required before the chart is worked out; then compute for real.
  useEffect(() => {
    if (stepId !== 'compute' || signedIn === null) return;
    if (!signedIn) {
      setGateOpen(true);
      track('quiz_signup_shown');
      return;
    }
    setGateOpen(false);
    if (computing.current) return;
    computing.current = true;

    const loader = getStep('compute');
    const lineCount = loader && loader.kind === 'loader' ? loader.lines.length : 1;
    setComputeLine(0);
    const timer = setInterval(() => setComputeLine((i) => Math.min(i + 1, lineCount - 1)), LINE_MS);
    const started = Date.now();

    void fetchChart(answers).then((facts) => {
      setChart(facts);
      const wait = Math.max(0, MIN_COMPUTE_MS - (Date.now() - started));
      setTimeout(() => {
        clearInterval(timer);
        computing.current = false;
        setStepId('recap');
      }, wait);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, signedIn]);

  // The chart is worked out on the compute step and not saved, so arriving on the recap from
  // saved progress (a reload, or coming back from Google sign-in) had no chart and told the
  // visitor the chart service was unreachable. Work it out again instead.
  useEffect(() => {
    if (stepId !== 'recap' || chart || computing.current) return;
    let cancelled = false;
    setChartLoading(true);
    void fetchChart(answers).then((facts) => {
      if (cancelled) return;
      setChart(facts);
      setChartLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  function commitDraft() {
    if (!step || !('field' in step)) return;
    const value = step.kind === 'text' ? draft.trim() : draft;
    const problem = validate(step, value);
    if (problem) {
      setError(problem);
      return;
    }
    const next = { ...answers, [step.field]: value };
    setAnswers(next);
    advance(next);
  }

  function choose(value: string) {
    if (!step || step.kind !== 'single') return;
    const next = { ...answers, [step.field]: value };
    setAnswers(next);
    if (step.autoAdvance) advance(next);
  }

  function toggle(value: string) {
    if (!step || step.kind !== 'multi') return;
    const current = Array.isArray(answers[step.field]) ? (answers[step.field] as string[]) : [];
    const values = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setAnswers({ ...answers, [step.field]: values });
  }

  function commitMulti() {
    if (!step || step.kind !== 'multi') return;
    const problem = validate(step, answers[step.field]);
    if (problem) {
      setError(problem);
      return;
    }
    advance(answers);
  }

  function pickCity(field: string, place: { name: string; lat: number; lng: number }) {
    const next = { ...answers, [field]: place.name, [`${field}_lat`]: String(place.lat), [`${field}_lng`]: String(place.lng) };
    setAnswers(next);
    advance(next);
  }

  async function checkout() {
    if (paying) return;
    setPaying(true);
    setBanner(null);
    track('checkout_started', { plan, product: 'subscription' });
    try {
      const r = await fetch('/api/ziina/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(checkoutBody(answers, plan, checkoutReportId())),
      });
      if (r.status === 401) {
        setSignedIn(false);
        setGateOpen(true);
        return;
      }
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        redirectUrl?: string;
        alreadyPaid?: boolean;
        amount?: number;
        currency?: string;
      };
      if (!r.ok) {
        setBanner(j.error ?? 'We could not start the payment. Please try again.');
        return;
      }
      if (j.alreadyPaid && j.redirectUrl) {
        window.location.href = j.redirectUrl;
        return;
      }
      if (!j.redirectUrl) {
        setBanner('We could not start the payment. Please try again.');
        return;
      }
      const currency: Currency = j.currency === 'INR' || j.currency === 'AED' ? j.currency : 'USD';
      setHandoff({ priceDisplay: formatAmount(j.amount ?? 0, currency), redirectUrl: j.redirectUrl, currency });
    } catch {
      setBanner('Network problem — please check your connection and try again.');
    } finally {
      setPaying(false);
    }
  }

  const pct =
    stepId === PAYWALL || stepId === 'recap' ? 1 : Math.max(0.03, progress(stepId, answers, floor));
  const position = step && step.kind !== 'loader' && step.kind !== 'recap' ? stepPosition(stepId, answers) : null;

  return (
    <main className="min-h-screen bg-space px-4 pt-4 pb-16">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {stepId !== firstStepId() && stepId !== 'compute' ? (
            <button type="button" onClick={back} className="font-body text-body-sm text-dust hover:text-star px-1 py-2" aria-label="Back">
              ← Back
            </button>
          ) : (
            <span className="w-12" aria-hidden />
          )}
          <div
            className="flex-1 h-1.5 rounded-full bg-horizon overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct * 100)}
          >
            <div className="h-full bg-amber transition-all duration-500" style={{ width: `${Math.round(pct * 100)}%` }} />
          </div>
          <span className="w-12 text-right font-body text-body-sm text-dust tabular-nums">
            {position ? `${position.index}/${position.total}` : ''}
          </span>
        </div>

        {step && step.kind === 'single' && (
          <section>
            <h1 className="font-body font-semibold text-star text-headline-lg mb-2">{step.title}</h1>
            {step.subtitle && <p className="font-body text-body-md text-dust mb-6">{step.subtitle}</p>}
            <div className="space-y-3" role="radiogroup" aria-label={step.title}>
              {step.options.map((o) => {
                const selected = answers[step.field] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => choose(o.value)}
                    className={`w-full text-left px-4 py-3.5 rounded-card border transition-colors ${
                      selected ? 'border-amber bg-amber/[0.08]' : 'border-horizon hover:border-amber/40'
                    }`}
                  >
                    <span className="block font-body text-body-lg text-star">{o.label}</span>
                    {o.hint && <span className="block font-body text-body-sm text-dust mt-0.5">{o.hint}</span>}
                  </button>
                );
              })}
            </div>
            {!step.autoAdvance && (
              <ContinueButton onClick={() => (answers[step.field] ? advance(answers) : setError('Please choose an option to continue.'))} />
            )}
          </section>
        )}

        {step && step.kind === 'multi' && (
          <section>
            <h1 className="font-body font-semibold text-star text-headline-lg mb-2">{step.title}</h1>
            {step.subtitle && <p className="font-body text-body-md text-dust mb-6">{step.subtitle}</p>}
            <div className="space-y-3">
              {step.options.map((o) => {
                const checked = Array.isArray(answers[step.field]) && (answers[step.field] as string[]).includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggle(o.value)}
                    className={`w-full text-left px-4 py-3.5 rounded-card border transition-colors flex items-center gap-3 ${
                      checked ? 'border-amber bg-amber/[0.08]' : 'border-horizon hover:border-amber/40'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center text-body-sm ${
                        checked ? 'border-amber bg-amber text-ink' : 'border-horizon'
                      }`}
                    >
                      {checked ? '✓' : ''}
                    </span>
                    <span className="font-body text-body-lg text-star">{o.label}</span>
                  </button>
                );
              })}
            </div>
            <ContinueButton onClick={commitMulti} />
          </section>
        )}

        {step && (step.kind === 'text' || step.kind === 'date' || step.kind === 'time') && (
          <section>
            <h1 className="font-body font-semibold text-star text-headline-lg mb-2">{step.title}</h1>
            {step.subtitle && <p className="font-body text-body-md text-dust mb-6">{step.subtitle}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commitDraft();
              }}
            >
              <input
                autoFocus
                type={step.kind === 'text' ? 'text' : step.kind}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={step.kind === 'text' ? step.placeholder : undefined}
                maxLength={step.kind === 'text' ? step.maxLength : undefined}
                max={step.kind === 'date' ? new Date().toISOString().slice(0, 10) : undefined}
                className="w-full px-4 py-3.5 min-h-[52px] bg-white/[0.05] border border-horizon rounded-card font-body text-body-lg text-star placeholder:text-dust/50 focus:outline-none focus:border-amber/60"
              />
              <ContinueButton type="submit" />
              {step.kind === 'text' && step.optional && (
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...answers, [step.field]: '' };
                    setAnswers(next);
                    advance(next);
                  }}
                  className="block w-full text-center font-body text-body-sm text-dust hover:text-star py-3"
                >
                  Skip this question
                </button>
              )}
            </form>
          </section>
        )}

        {step && step.kind === 'city' && (
          <CityStep
            key={step.id}
            title={step.title}
            subtitle={step.subtitle}
            initial={typeof answers[step.field] === 'string' ? (answers[step.field] as string) : ''}
            saved={
              typeof answers[step.field] === 'string' &&
              num(answers[`${step.field}_lat`]) !== undefined &&
              num(answers[`${step.field}_lng`]) !== undefined
                ? {
                    name: answers[step.field] as string,
                    lat: num(answers[`${step.field}_lat`])!,
                    lng: num(answers[`${step.field}_lng`])!,
                  }
                : null
            }
            onPick={(place) => pickCity(step.field, place)}
          />
        )}

        {step && step.kind === 'info' && (
          <section>
            <h1 className="font-body font-semibold text-star text-headline-lg mb-3">{step.title}</h1>
            <p className="font-body text-body-lg text-dust-light mb-6">{step.body}</p>
            <ContinueButton label={step.cta} onClick={() => advance(answers)} />
          </section>
        )}

        {step && step.kind === 'loader' && (
          <section className="pt-10 text-center" aria-live="polite">
            <h1 className="font-body font-semibold text-star text-headline-lg mb-8">{step.title}</h1>
            <ul className="space-y-3 text-left max-w-xs mx-auto">
              {step.lines.map((line, i) => (
                <li key={line} className={`font-body text-body-md flex gap-3 ${i <= computeLine ? 'text-star' : 'text-dust/40'}`}>
                  <span aria-hidden className="text-amber w-4">{i < computeLine ? '✓' : i === computeLine ? '•' : ''}</span>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        )}

        {step && step.kind === 'recap' && (
          <Recap answers={answers} chart={chart} loading={chartLoading} onContinue={() => setStepId(PAYWALL)} />
        )}

        {stepId === PAYWALL && (
          <Paywall
            answers={answers}
            prices={prices}
            plan={plan}
            onPlan={setPlan}
            paying={paying}
            banner={banner}
            activeUntil={renewing ? null : activeUntil}
            onCheckout={() => void checkout()}
          />
        )}

        {error && (
          <p role="alert" className="mt-4 font-body text-body-sm text-caution">
            {error}
          </p>
        )}
      </div>

      {gateOpen && (
        <DeliveryGate
          resumePath="/start?resume=1"
          title="Save your answers to your account"
          subtitle="Your chart and your daily timings are kept under this account, so you can come back to them any time. It takes a few seconds."
          onCancel={() => {
            setGateOpen(false);
            setStepId(prevStepId('compute', answers) ?? firstStepId());
          }}
          onAuthed={() => {
            track('quiz_signup_done', { method: 'email' });
            setSignedIn(true);
            setGateOpen(false);
          }}
          onGoogle={() => {
            saveQuiz(answers, 'compute');
            track('quiz_signup_done', { method: 'google' });
          }}
        />
      )}

      {handoff && (
        <PaymentHandoff
          productName={plan === 'sub_annual' ? 'VedicHour Annual Subscription' : 'VedicHour Monthly Subscription'}
          priceDisplay={handoff.priceDisplay}
          redirectUrl={handoff.redirectUrl}
          currency={handoff.currency}
          onCancel={() => setHandoff(null)}
        />
      )}
    </main>
  );
}

function ContinueButton({ onClick, label = 'Continue', type = 'button' }: { onClick?: () => void; label?: string; type?: 'button' | 'submit' }) {
  return (
    <button type={type} onClick={onClick} className="btn-primary w-full py-3.5 mt-6 font-body text-body-lg">
      {label}
    </button>
  );
}

function CityStep({
  title,
  subtitle,
  initial,
  saved,
  onPick,
}: {
  title: string;
  subtitle?: string;
  initial: string;
  /** A place already located (going back, or pre-filled from an earlier visit) — keep it in one tap. */
  saved: { name: string; lat: number; lng: number } | null;
  onPick: (place: { name: string; lat: number; lng: number }) => void;
}) {
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'none' | 'error'>('idle');

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const term = query.trim();
    if (term.length < 2) return;
    setStatus('loading');
    try {
      const r = await fetch(`/api/geocode?city=${encodeURIComponent(term)}`);
      if (!r.ok) {
        // A rate limit or a geocoder outage is not "no such place" — never tell someone
        // their birth town does not exist because the search was busy.
        setResults([]);
        setStatus('error');
        return;
      }
      const data = (await r.json().catch(() => [])) as Array<{ lat: string; lon: string; display_name?: string }>;
      const list = (Array.isArray(data) ? data : [])
        .slice(0, 5)
        .map((d) => ({ name: shortPlace(d.display_name ?? term), lat: parseFloat(d.lat), lng: parseFloat(d.lon) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        // Two results that read identically are useless as a choice — keep the higher-ranked one.
        .filter((p, i, all) => all.findIndex((q) => q.name === p.name) === i);
      setResults(list);
      setStatus(list.length ? 'idle' : 'none');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section>
      <h1 className="font-body font-semibold text-star text-headline-lg mb-2">{title}</h1>
      {subtitle && <p className="font-body text-body-md text-dust mb-6">{subtitle}</p>}
      {saved && (
        <button
          type="button"
          onClick={() => onPick(saved)}
          className="w-full text-left px-4 py-3.5 mb-4 rounded-card border border-amber bg-amber/[0.08] font-body text-body-lg text-star"
        >
          Use {saved.name}
        </button>
      )}
      <form onSubmit={(e) => void search(e)} className="flex gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Town or city"
          className="flex-1 min-w-0 px-4 py-3.5 min-h-[52px] bg-white/[0.05] border border-horizon rounded-card font-body text-body-lg text-star placeholder:text-dust/50 focus:outline-none focus:border-amber/60"
        />
        <button type="submit" disabled={status === 'loading'} className="btn-primary px-5 font-body text-body-md disabled:opacity-60">
          {status === 'loading' ? '…' : 'Find'}
        </button>
      </form>
      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="font-body text-body-sm text-dust">Tap the right one:</p>
          {results.map((p) => (
            <button
              key={`${p.lat},${p.lng}`}
              type="button"
              onClick={() => onPick(p)}
              className="w-full text-left px-4 py-3 rounded-card border border-horizon hover:border-amber/40 font-body text-body-md text-star"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      {status === 'none' && (
        <p className="mt-4 font-body text-body-sm text-dust">No place found. Try the nearest bigger town.</p>
      )}
      {status === 'error' && (
        <p className="mt-4 font-body text-body-sm text-caution">We could not search just now. Please wait a few seconds and tap Find again.</p>
      )}
    </section>
  );
}

function Recap({
  answers,
  chart,
  loading,
  onContinue,
}: {
  answers: Answers;
  chart: ChartFacts | null;
  loading: boolean;
  onContinue: () => void;
}) {
  const name = typeof answers.first_name === 'string' && answers.first_name.trim() ? answers.first_name.trim() : null;
  const confidence = timeConfidence(answers);
  const ends = formatMonthYear(chart?.periodEnds ?? null);
  const facts: [string, string][] = [];
  if (chart?.lagna) facts.push(['Rising sign (Lagna)', chart.lagna]);
  if (chart?.moonSign) facts.push(['Moon sign', chart.moonSign]);
  if (chart?.nakshatra) facts.push(['Birth star (Nakshatra)', chart.nakshatra]);
  if (chart?.period) facts.push(['Period you are in now', ends ? `${chart.period}, until ${ends}` : chart.period]);

  return (
    <section>
      <p className="font-body text-body-sm text-amber mb-2">Your chart is ready</p>
      <h1 className="font-body font-semibold text-star text-headline-lg mb-5">
        {name ? `${name}, here` : 'Here'} is where you stand on {concernHeadline(answers)}.
      </h1>

      {facts.length > 0 ? (
        <dl className="rounded-card border border-horizon bg-cosmos divide-y divide-horizon mb-5">
          {facts.map(([k, v]) => (
            <div key={k} className="px-4 py-3 flex justify-between gap-4">
              <dt className="font-body text-body-sm text-dust">{k}</dt>
              <dd className="font-body text-body-md text-star text-right">{v}</dd>
            </div>
          ))}
        </dl>
      ) : loading ? (
        <p className="font-body text-body-md text-dust mb-5" role="status">
          Working out your chart…
        </p>
      ) : (
        <p className="font-body text-body-md text-dust mb-5">
          We could not reach the chart service just now. Your full forecast is still worked out once you subscribe.
        </p>
      )}

      {confidence === 'approx' && (
        <p className="font-body text-body-sm text-dust-light mb-5">
          You gave an approximate birth time, so anything tied to your rising sign is marked as approximate.
        </p>
      )}
      {confidence === 'unknown' && (
        <p className="font-body text-body-sm text-dust-light mb-5">
          Without a birth time, your rising sign and houses cannot be trusted. Your Moon, birth star and the period you
          are in do not depend on the hour, and we will say plainly wherever the hour would matter.
        </p>
      )}

      <h2 className="font-body font-semibold text-star text-headline-sm mb-3">What your subscription gives you</h2>
      <ul className="space-y-2 mb-2 font-body text-body-md text-dust-light">
        <li>• Your next 30 days, every hour scored, with the best and worst windows marked</li>
        <li>• Readings written around {concernHeadline(answers)}, not a generic horoscope</li>
        <li>• A fresh 30-day forecast every month while you stay subscribed</li>
        <li>• Ask questions about your own chart, and your Kundli and matchmaking reports</li>
      </ul>

      <ContinueButton label="See plans" onClick={onContinue} />
    </section>
  );
}

function Paywall({
  answers,
  prices,
  plan,
  onPlan,
  paying,
  banner,
  activeUntil,
  onCheckout,
}: {
  answers: Answers;
  prices: Prices | null;
  plan: SubPlan;
  onPlan: (p: SubPlan) => void;
  paying: boolean;
  banner: string | null;
  activeUntil: string | null;
  onCheckout: () => void;
}) {
  if (activeUntil) {
    return (
      <section>
        <h1 className="font-body font-semibold text-star text-headline-lg mb-3">You are already subscribed</h1>
        <p className="font-body text-body-md text-dust-light mb-6">
          Your subscription runs until{' '}
          {new Date(activeUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
        <Link href="/dashboard" className="btn-primary block text-center w-full py-3.5 font-body text-body-lg">
          Go to my dashboard
        </Link>
      </section>
    );
  }

  const selected = plan === 'sub_annual' ? prices?.annual : prices?.monthly;
  const options: { id: SubPlan; title: string; price: string | undefined; per: string; note: string }[] = [
    { id: 'sub_monthly', title: 'Monthly', price: prices?.monthly, per: 'per month', note: 'A new 30-day forecast each month' },
    { id: 'sub_annual', title: 'Yearly', price: prices?.annual, per: 'per year', note: '12 monthly forecasts, paid once a year' },
  ];

  return (
    <section>
      <h1 className="font-body font-semibold text-star text-headline-lg mb-2">Choose your plan</h1>
      <p className="font-body text-body-md text-dust mb-5">
        For {concernHeadline(answers)}, planned hour by hour.
      </p>

      {banner && (
        <p role="alert" className="mb-4 px-4 py-3 rounded-card border border-caution/40 bg-caution/10 font-body text-body-sm text-caution">
          {banner}
        </p>
      )}

      <div className="space-y-3 mb-5" role="radiogroup" aria-label="Subscription plan">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={plan === o.id}
            onClick={() => onPlan(o.id)}
            className={`w-full text-left px-4 py-4 rounded-card border transition-colors ${
              plan === o.id ? 'border-amber bg-amber/[0.08]' : 'border-horizon hover:border-amber/40'
            }`}
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-body font-semibold text-body-lg text-star">{o.title}</span>
              <span className="font-body text-body-lg text-star tabular-nums">
                {o.price ?? '—'} <span className="text-body-sm text-dust">{o.per}</span>
              </span>
            </span>
            <span className="block font-body text-body-sm text-dust mt-1">{o.note}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={paying || !prices}
        className="btn-primary w-full py-3.5 font-body text-body-lg disabled:opacity-60"
      >
        {paying ? 'Starting secure payment…' : selected ? `Subscribe — ${selected}` : 'Subscribe'}
      </button>

      <p className="font-body text-body-sm text-dust mt-4">
        Nothing is charged automatically. Before each period ends we remind you, and you renew with one tap. Stop any
        time by simply not renewing.
      </p>
      <p className="font-body text-body-sm text-dust/70 mt-2">Card payments through Ziina. UPI is not available yet.</p>
    </section>
  );
}
