'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getQuizSlug, DEFAULT_SLUG } from '@/config/quiz_slugs';
import { FLAG_CONTACT_REQUIRED, FLAG_PRICE_REPORT, FLAG_QUIZ_LENGTH, assignArm } from '@/config/quiz_flags';
import {
  FOCUS_INTERSTITIAL,
  FOCUS_LABEL,
  goalInterstitial,
  screensFor,
  type FocusArea,
  type FunnelAnswers,
  type Lang,
  type Screen,
} from '@/lib/funnel/screens';
import { barFraction, birthReady, counter, nextScreen, prevScreen, resumeTarget } from '@/lib/funnel/engine';
import { attributionFrom, loadState, newSessionId, saveState, type Contact, type FunnelState } from '@/lib/funnel/state';
import { funnelEvent, pixelEvent, type EventContext } from '@/lib/funnel/events';
import type { RevealData } from '@/lib/funnel/reveal/compute';
import { placeLabel, type Place } from '@/lib/funnel/cities';
import { validate as validateStartStep, getStep as getStartStep } from '@/lib/quiz/engine';
import { funnelPersonalContext } from '@/lib/quiz/personalContext';
import { saveQuiz } from '@/lib/quiz/persist';
import { formatAmount } from '@/lib/ziina/amounts';
import { DeliveryGate } from '@/components/onboard/DeliveryGate';
import { PaymentHandoff } from '@/components/checkout/PaymentHandoff';
import { InfoScreen, InputScreen, PictureScreen, SingleScreen, Sub, Title, t } from '@/components/funnel/QuestionScreens';
import { CityTypeahead } from '@/components/funnel/CityTypeahead';
import { CalcScreen, type RevealRequest } from '@/components/funnel/CalcScreen';
import { ContactScreen } from '@/components/funnel/ContactScreen';
import { RevealScreen } from '@/components/funnel/RevealScreen';
import { OfferScreen, type OfferInfo } from '@/components/funnel/OfferScreen';

/**
 * /q/[slug] — the ad funnel (VEDICHOUR_QUIZ_SPEC §4–5):
 * S01–S13 questions → S14 real calculation → S15 contact → S16 free computed reveal → S17 offer.
 * No account or password is asked for before the reveal; sign-in happens only when someone
 * taps pay, because checkout needs an owner for the purchase.
 */

type Plan = 'blueprint' | 'blueprint_plus30' | 'sub_monthly';
type Currency = 'INR' | 'USD' | 'AED';

const CHECKOUT_KEY = 'vh_q_checkout_v1';

function checkoutReportId(plan: Plan): string {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_KEY);
    const saved = raw ? (JSON.parse(raw) as { id?: string; plan?: string; at?: number }) : null;
    if (saved?.id && saved.plan === plan && typeof saved.at === 'number' && Date.now() - saved.at < 30 * 60_000) return saved.id;
    const id = newSessionId();
    sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify({ id, plan, at: Date.now() }));
    return id;
  } catch {
    return newSessionId();
  }
}

function revealKey(a: FunnelAnswers): string {
  return [a.birth_date, a.birth_time_known, a.birth_time, a.birth_city_lat, a.birth_city_lng, a.focus_area, a.self_role].join('|');
}

function revealRequest(a: FunnelAnswers): RevealRequest {
  const known = a.birth_time_known === 'exact' || a.birth_time_known === 'approx';
  return {
    birth_date: a.birth_date ?? '',
    birth_time: known ? a.birth_time ?? null : null,
    time_known: a.birth_time_known ?? 'unknown',
    city: a.birth_city ?? '',
    lat: Number(a.birth_city_lat),
    lng: Number(a.birth_city_lng),
    focus_area: a.focus_area,
    self_role: a.self_role,
  };
}

function savedPlace(a: FunnelAnswers, field: 'birth_city' | 'current_city'): Place | null {
  const lat = Number(a[`${field}_lat`]);
  const lng = Number(a[`${field}_lng`]);
  if (!a[field] || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const [name, ...rest] = (a[field] as string).split(', ');
  return { name, region: rest.join(', '), lat, lng };
}

export function Funnel({ slugKey }: { slugKey: string }) {
  const params = useSearchParams();
  const slug = getQuizSlug(slugKey) ?? getQuizSlug(DEFAULT_SLUG)!;

  const [st, setSt] = useState<FunnelState | null>(null);
  const [revealFor, setRevealFor] = useState<string>('');
  const [offer, setOffer] = useState<OfferInfo | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [gate, setGate] = useState<Plan | null>(null);
  const [askCity, setAskCity] = useState(false);
  const [bump, setBump] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<{ plan: Plan; priceDisplay: string; redirectUrl: string; currency: Currency } | null>(null);
  const resumedCheckout = useRef(false);

  // ── boot: restore or start a session ────────────────────────────────────
  useEffect(() => {
    const saved = loadState(slug.slug);
    const attr = attributionFrom(params);
    const langParam = params.get('lang');
    const lang: Lang = langParam === 'hi' || langParam === 'en' ? langParam : saved?.lang ?? 'en';
    let next: FunnelState;
    if (saved) {
      next = {
        ...saved,
        lang,
        // A fresh ad click keeps its own attribution.
        utm: Object.keys(attr.utm).length ? attr.utm : saved.utm,
        fbclid: attr.fbclid ?? saved.fbclid,
        gclid: attr.gclid ?? saved.gclid,
      };
    } else {
      next = {
        v: 1,
        sessionId: newSessionId(),
        slug: slug.slug,
        lang,
        screenId: 's01',
        // The slug pre-answers S01 (spec §5); the visitor can still change it.
        answers: { hook: 'again' },
        ...attr,
        contact: null,
        contactSkipped: false,
        reveal: null,
        savedAt: Date.now(),
      };
    }
    setSt(next);
    setRevealFor(next.reveal ? revealKey(next.answers) : '');

    fetch('/api/quiz/offer', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((o: OfferInfo | null) => o && setOffer(o))
      .catch(() => {});

    const sb = createClient();
    void sb.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session?.user)));
    if (params.get('payment')) {
      setBanner(
        params.get('payment') === 'pending'
          ? 'Your payment is still being confirmed. You will not be charged twice.'
          : 'The payment did not go through, and nothing was charged. You can try again below.',
      );
    }
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flags = useMemo(() => {
    if (!st) return null;
    return {
      quiz_length: assignArm(FLAG_QUIZ_LENGTH, st.sessionId),
      contact_required: assignArm(FLAG_CONTACT_REQUIRED, st.sessionId),
      price_report: assignArm(FLAG_PRICE_REPORT, st.sessionId),
    };
  }, [st?.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const screens = useMemo(() => (flags ? screensFor(slug, flags.quiz_length) : []), [slug, flags]);
  const lang: Lang = st?.lang ?? 'en';

  const ctx: EventContext | null = useMemo(
    () =>
      st && flags
        ? { sessionId: st.sessionId, slug: slug.slug, lang: st.lang, utm: st.utm, fbclid: st.fbclid, gclid: st.gclid, geo: offer?.country ?? null, flags }
        : null,
    [st?.sessionId, st?.lang, st?.utm, st?.fbclid, st?.gclid, slug.slug, offer?.country, flags], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Resume at a safe screen once screens are known.
  const booted = useRef(false);
  useEffect(() => {
    if (!st || !screens.length || booted.current) return;
    booted.current = true;
    const target = resumeTarget(screens, params.get('resume') === 'checkout' ? 's17' : st.screenId, st.answers);
    // A reveal needs its computed data; without it, recompute.
    const id = (target.kind === 'reveal' || target.kind === 'offer') && !st.reveal ? 's14' : target.id;
    if (id !== st.screenId) setSt({ ...st, screenId: id });
  }, [st, screens, params]);

  // Persist locally on every change; mirror to the server (best effort) on screen change.
  useEffect(() => {
    if (st) saveState(st);
  }, [st]);

  const screen: Screen | undefined = st ? screens.find((s) => s.id === st.screenId) : undefined;

  const syncServer = useCallback(
    (s: FunnelState, extra: Record<string, unknown> = {}) => {
      if (!flags) return;
      fetch('/api/quiz/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          id: s.sessionId,
          slug: s.slug,
          lang: s.lang,
          utm: s.utm,
          fbclid: s.fbclid,
          gclid: s.gclid,
          flags,
          answers: s.answers,
          step: s.screenId,
          ...(s.contact ? { contact: { channel: s.contact.channel, value: s.contact.value, name: s.contact.name }, consent: s.contact.consent } : {}),
          ...extra,
        }),
      }).catch(() => {});
    },
    [flags],
  );

  // quiz_view on every screen change (+ offer_view / reveal_view below).
  const lastViewed = useRef<string>('');
  useEffect(() => {
    if (!st || !ctx || !screen || lastViewed.current === screen.id) return;
    lastViewed.current = screen.id;
    funnelEvent(ctx, 'quiz_view', { step: screen.spec });
    if (screen.kind === 'reveal') {
      funnelEvent(ctx, 'reveal_view');
      pixelEvent(ctx, 'CompleteRegistration', 'reveal');
      syncServer(st, { reveal_viewed: true });
    } else {
      syncServer(st);
    }
    if (screen.kind === 'offer') funnelEvent(ctx, 'offer_view', { blueprint_open: Boolean(offer?.blueprintOpen) });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, [st, ctx, screen, syncServer, offer?.blueprintOpen]);

  const go = useCallback(
    (answers: FunnelAnswers, from: string, patch: Partial<FunnelState> = {}) => {
      setSt((prev) => {
        if (!prev) return prev;
        const nxt = nextScreen(screens, from, answers);
        return { ...prev, ...patch, answers, screenId: nxt ? nxt.id : prev.screenId };
      });
    },
    [screens],
  );

  const answer = useCallback(
    (field: string, value: string, extra: FunnelAnswers = {}) => {
      if (!st || !screen || !ctx) return;
      const answers = { ...st.answers, ...extra, [field]: value };
      const personal = field.startsWith('birth_');
      funnelEvent(ctx, 'quiz_answer', { step: screen.spec, value: personal ? 'set' : value });
      go(answers, screen.id);
    },
    [st, screen, ctx, go],
  );

  function back() {
    if (!st || !screen || !ctx) return;
    const prev = prevScreen(screens, screen.id, st.answers);
    if (!prev) return;
    funnelEvent(ctx, 'quiz_back', { step: screen.spec });
    setSt({ ...st, screenId: prev.id });
  }

  function setLang(l: Lang) {
    if (st) setSt({ ...st, lang: l });
  }

  // ── checkout ─────────────────────────────────────────────────────────────
  const startCheckout = useCallback(
    async (plan: Plan) => {
      if (!st || !ctx || busy) return;
      setBusy(true);
      setBanner(null);
      const a = st.answers;
      const known = a.birth_time_known === 'exact' || a.birth_time_known === 'approx';
      const name = (st.contact?.name ?? '').trim();
      const reportId = checkoutReportId(plan);
      const personal = funnelPersonalContext(a, slug);
      try {
        const r = await fetch('/api/ziina/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            planType: plan,
            reportId,
            name,
            ...(st.contact?.channel === 'whatsapp' ? { phone: st.contact.value } : {}),
            birth_date: a.birth_date,
            birth_time: known && a.birth_time ? `${a.birth_time}:00` : '12:00:00',
            birth_city: a.birth_city,
            birth_lat: Number(a.birth_city_lat),
            birth_lng: Number(a.birth_city_lng),
            ...(a.current_city && a.current_city_lat
              ? { current_city: a.current_city, current_lat: Number(a.current_city_lat), current_lng: Number(a.current_city_lng) }
              : {}),
            personal_context: personal,
          }),
        });
        if (r.status === 401) {
          setGate(plan);
          return;
        }
        const j = (await r.json().catch(() => ({}))) as { error?: string; redirectUrl?: string; alreadyPaid?: boolean; amount?: number; currency?: string };
        if (!r.ok || !j.redirectUrl) {
          setBanner(j.error ?? 'We could not start the payment. Please try again.');
          return;
        }
        if (j.alreadyPaid) {
          window.location.href = j.redirectUrl;
          return;
        }
        // The subscription's cancel/pending return lands on /start's paywall; give it these
        // answers so it shows the plans (with this brief) instead of question one.
        if (plan === 'sub_monthly') {
          saveQuiz(
            {
              first_name: name || undefined,
              birth_date: a.birth_date,
              birth_time_known: a.birth_time_known === 'unknown' ? 'unknown' : a.birth_time_known,
              birth_time: a.birth_time,
              birth_city: a.birth_city,
              birth_city_lat: a.birth_city_lat,
              birth_city_lng: a.birth_city_lng,
              current_city: a.current_city,
              current_city_lat: a.current_city_lat,
              current_city_lng: a.current_city_lng,
              renew_context: personal,
            },
            'paywall',
          );
        }
        const currency: Currency = j.currency === 'INR' || j.currency === 'AED' ? j.currency : 'USD';
        setHandoff({ plan, priceDisplay: formatAmount(j.amount ?? 0, currency), redirectUrl: j.redirectUrl, currency });
      } catch {
        setBanner('Network problem — please check your connection and try again.');
      } finally {
        setBusy(false);
      }
    },
    [st, ctx, busy, slug],
  );

  function buy(plan: Plan) {
    if (!st || !ctx) return;
    funnelEvent(ctx, 'checkout_start', { plan });
    pixelEvent(ctx, 'InitiateCheckout', `checkout:${plan}`);
    if (plan === 'blueprint_plus30') funnelEvent(ctx, 'bump_taken');
    if (plan === 'sub_monthly' && !st.answers.current_city) {
      setAskCity(true);
      return;
    }
    if (!signedIn) {
      setGate(plan);
      return;
    }
    void startCheckout(plan);
  }

  // Back from Google sign-in with a pending checkout: carry straight on.
  useEffect(() => {
    if (resumedCheckout.current || !signedIn || !st || params.get('resume') !== 'checkout') return;
    const pending = (() => {
      try {
        return sessionStorage.getItem('vh_q_pending_plan') as Plan | null;
      } catch {
        return null;
      }
    })();
    if (!pending) return;
    resumedCheckout.current = true;
    try {
      sessionStorage.removeItem('vh_q_pending_plan');
    } catch {
      /* ignore */
    }
    void startCheckout(pending);
  }, [signedIn, st, params, startCheckout]);

  if (!st || !screen || !ctx || !flags) {
    return <main className="min-h-screen bg-space" />;
  }

  const a = st.answers;
  const c = counter(screens, screen.id);
  const pct = barFraction(screens, screen.id);
  const india = (offer?.country ?? '') === 'IN' || offer?.currency === 'INR';
  const focus = a.focus_area as FocusArea | undefined;
  const focusLabel = focus ? FOCUS_LABEL[focus][lang] : null;
  const canBack = screen.id !== 's01' && screen.kind !== 'calc';
  const paper = screen.kind === 'offer';
  const blueprintCta = offer?.blueprintOpen && offer.prices.blueprint ? `Unlock my full blueprint — ${offer.prices.blueprint.display}` : 'Unlock my full blueprint';

  return (
    <main className={`min-h-screen ${paper ? 'bg-parchment' : 'bg-space'}`}>
      <div className={paper ? 'bg-space' : ''}>
        <div className="max-w-md mx-auto px-4 pt-3 pb-2">
          <div className="flex items-center gap-3 min-h-[44px]">
            {canBack ? (
              <button type="button" onClick={back} aria-label="Back" className="w-11 h-11 -ml-2 flex items-center justify-center text-dust-light hover:text-star">
                <svg viewBox="0 0 20 20" className="w-5 h-5" aria-hidden>
                  <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <span className="w-9" aria-hidden />
            )}
            <div
              className="flex-1 h-1.5 rounded-full bg-horizon overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct * 100)}
            >
              <div className="h-full bg-amber transition-[width] duration-300 ease-out" style={{ width: `${Math.round(pct * 100)}%` }} />
            </div>
            <span className="min-w-[3rem] text-right font-body text-body-md text-dust-light tabular-nums">{c ? `${c.n}/${c.of}` : ''}</span>
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="ml-1 px-2 min-h-[44px] font-body text-body-sm text-dust-light underline underline-offset-4"
              aria-label={lang === 'en' ? 'Switch to Hinglish' : 'Switch to English'}
            >
              {lang === 'en' ? 'Hinglish' : 'English'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 pb-16">
        {screen.id === 's01' && <p className="font-body text-label-md text-amber-light mb-3">{t(slug.eyebrow, lang)}</p>}

        {screen.kind === 'single' && (
          <SingleScreen
            title={screen.title}
            subtitle={screen.subtitle}
            options={screen.options}
            selected={a[screen.field]}
            lang={lang}
            onChoose={(v) => answer(screen.field, v)}
          />
        )}

        {screen.kind === 'picture' && (
          <PictureScreen
            key={screen.id}
            title={screen.title}
            options={screen.options}
            toast={screen.toast}
            selected={a[screen.field]}
            lang={lang}
            onChoose={(v) => answer(screen.field, v)}
          />
        )}

        {screen.kind === 'info' && (
          <InfoScreen
            key={screen.id}
            lang={lang}
            {...(screen.id === 'i_focus'
              ? { ...FOCUS_INTERSTITIAL[focus ?? 'career'], cta: screen.cta }
              : screen.id === 'i_goal'
                ? { ...goalInterstitial(a.goal_12m), cta: screen.cta }
                : { title: screen.title, body: screen.body, cta: screen.cta })}
            onNext={() => {
              funnelEvent(ctx, 'quiz_answer', { step: screen.spec, value: 'continue' });
              go(a, screen.id);
            }}
          />
        )}

        {(screen.kind === 'date' || screen.kind === 'time') && (
          <InputScreen
            key={screen.id}
            kind={screen.kind}
            title={screen.title}
            subtitle={screen.subtitle}
            initial={a[screen.field] ?? ''}
            lang={lang}
            validate={(v) => {
              const step = getStartStep(screen.kind === 'date' ? 'birth_date' : 'birth_time');
              return step ? validateStartStep(step, v) : null;
            }}
            onSubmit={(v) => answer(screen.field, v)}
          />
        )}

        {screen.kind === 'city' && (
          <section>
            <Title>{t(screen.title, lang)}</Title>
            {screen.subtitle && <Sub>{t(screen.subtitle, lang)}</Sub>}
            <CityTypeahead
              key={screen.id}
              initial=""
              saved={savedPlace(a, 'birth_city')}
              placeholder={lang === 'hi' ? 'Shehar ya kasba likhein' : 'Start typing your town or city'}
              labels={{
                searching: lang === 'hi' ? 'Dhoondh rahe hain…' : 'Searching…',
                none: lang === 'hi' ? 'Koi jagah nahi mili. Paas ka bada shehar likhein.' : 'No place found. Try the nearest bigger town.',
                error: lang === 'hi' ? 'Abhi search nahi ho paya. Kuch second baad phir likhein.' : 'Search is busy. Keep typing, or try again in a few seconds.',
                use: lang === 'hi' ? 'Yahi rakhein:' : 'Use',
              }}
              onPick={(p) =>
                answer('birth_city', placeLabel(p), { birth_city_lat: String(p.lat), birth_city_lng: String(p.lng) })
              }
            />
          </section>
        )}

        {screen.kind === 'calc' &&
          (birthReady(a) ? (
            <CalcScreen
              key={revealKey(a)}
              request={revealRequest(a)}
              lang={lang}
              onDone={(reveal: RevealData) => {
                funnelEvent(ctx, 'calc_complete', { reference: reveal.reference });
                setRevealFor(revealKey(a));
                go(a, screen.id, { reveal });
              }}
            />
          ) : (
            <p className="font-body text-body-lg text-dust-light">Some birth details are missing. Please go back and check them.</p>
          ))}

        {screen.kind === 'contact' && (
          <ContactScreen
            india={india}
            required={flags.contact_required === 'A'}
            initial={st.contact}
            lang={lang}
            onSubmit={(contact: Contact) => {
              funnelEvent(ctx, 'contact_submit', { channel: contact.channel, consent: contact.consent });
              pixelEvent(ctx, 'Lead', 'contact');
              const next = { ...st, contact, contactSkipped: false };
              syncServer(next);
              go(a, screen.id, { contact, contactSkipped: false });
            }}
            onSkip={() => {
              funnelEvent(ctx, 'contact_skip');
              go(a, screen.id, { contactSkipped: true });
            }}
          />
        )}

        {screen.kind === 'reveal' && st.reveal && revealFor === revealKey(a) && (
          <RevealScreen reveal={st.reveal} name={st.contact?.name} ctaLabel={blueprintCta} onCta={() => go(a, screen.id)} />
        )}
        {screen.kind === 'reveal' && (!st.reveal || revealFor !== revealKey(a)) && (
          <div className="text-center pt-10">
            <p className="font-body text-body-lg text-dust-light mb-6">Your answers changed, so your chart needs working out again.</p>
            <button type="button" className="btn-primary min-h-[52px] px-6" onClick={() => setSt({ ...st, screenId: 's14' })}>
              Work it out
            </button>
          </div>
        )}

        {screen.kind === 'offer' && (
          <OfferScreen
            offer={offer}
            focusLabel={focus ? FOCUS_LABEL[focus].en : null}
            bump={bump}
            onBump={setBump}
            busy={busy}
            banner={banner}
            contactLabel={st.contact ? (st.contact.channel === 'whatsapp' ? 'your WhatsApp number' : 'your email') : null}
            onBuyBlueprint={() => buy(bump ? 'blueprint_plus30' : 'blueprint')}
            onBuySubscription={() => buy('sub_monthly')}
            onAddContact={() => setSt({ ...st, screenId: 's15' })}
          />
        )}
      </div>

      {askCity && (
        <div className="fixed inset-0 z-50 bg-[rgba(10,7,19,.62)] backdrop-blur-sm flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Where do you live now?">
          <div className="w-full max-w-md bg-cosmos rounded-t-[24px] sm:rounded-[20px] px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] max-h-[90vh] overflow-y-auto">
            <Title>Where do you live now?</Title>
            <Sub>Your hour-by-hour timings follow your local sunrise.</Sub>
            {savedPlace(a, 'birth_city') && (
              <button
                type="button"
                onClick={() => {
                  const next = { ...a, current_city: a.birth_city, current_city_lat: a.birth_city_lat, current_city_lng: a.birth_city_lng };
                  setSt({ ...st, answers: next });
                  setAskCity(false);
                  if (signedIn) void startCheckout('sub_monthly');
                  else setGate('sub_monthly');
                }}
                className="w-full text-left px-4 min-h-[56px] mb-3 rounded-[14px] border border-amber bg-amber/[0.08] font-body text-body-lg text-star"
              >
                Same as where I was born ({a.birth_city?.split(',')[0]})
              </button>
            )}
            <CityTypeahead
              initial=""
              saved={null}
              placeholder="Start typing your town or city"
              labels={{ searching: 'Searching…', none: 'No place found. Try the nearest bigger town.', error: 'Search is busy. Try again in a few seconds.', use: 'Use' }}
              onPick={(p) => {
                const next = { ...a, current_city: placeLabel(p), current_city_lat: String(p.lat), current_city_lng: String(p.lng) };
                setSt({ ...st, answers: next });
                setAskCity(false);
                if (signedIn) void startCheckout('sub_monthly');
                else setGate('sub_monthly');
              }}
            />
            <button type="button" onClick={() => setAskCity(false)} className="block w-full text-center mt-4 py-3 font-body text-body-md text-dust">
              Go back
            </button>
          </div>
        </div>
      )}

      {gate && (
        <DeliveryGate
          defaultEmail={st.contact?.channel === 'email' ? st.contact.value : ''}
          resumePath={`/q/${slug.slug}?resume=checkout`}
          title="Save your blueprint to an account"
          subtitle="Your purchase and your chart are kept under this account, so you can open them again any time."
          onCancel={() => setGate(null)}
          onAuthed={() => {
            const plan = gate;
            setSignedIn(true);
            setGate(null);
            void startCheckout(plan);
          }}
          onGoogle={() => {
            saveState({ ...st, screenId: 's17' });
            try {
              sessionStorage.setItem('vh_q_pending_plan', gate);
            } catch {
              /* ignore */
            }
          }}
        />
      )}

      {handoff && (
        <PaymentHandoff
          productName={
            handoff.plan === 'sub_monthly'
              ? 'VedicHour Monthly Subscription'
              : handoff.plan === 'blueprint_plus30'
                ? 'Full Karmic Blueprint + next 30 days'
                : 'Full Karmic Blueprint'
          }
          priceDisplay={handoff.priceDisplay}
          redirectUrl={handoff.redirectUrl}
          currency={handoff.currency}
          onCancel={() => setHandoff(null)}
        />
      )}
    </main>
  );
}
