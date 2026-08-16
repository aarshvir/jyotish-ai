import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/shared/Footer';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbLd, softwareAppLd } from '@/lib/seo/jsonLd';
import { SAMPLE_GRID, SAMPLE_SEEKER, SAMPLE_DAY_SCORE } from '@/components/landing/sampleData';
import { UNLOCK_FREE_HREF } from '@/lib/pricing';

export const metadata: Metadata = {
  title: 'Sample Vedic Day Timing Report — All 18 Hourly Windows',
  description:
    'A full sample Vedic day timing report: all 18 hourly windows for one real birth chart, each scored and explained in plain English — what each hour of the day actually suits.',
  alternates: { canonical: '/sample-report' },
  openGraph: {
    title: 'Sample Vedic Day Timing Report — All 18 Hourly Windows',
    description:
      'One full day, hour by hour: every window scored and explained in plain English. See what a VedicHour report actually looks like.',
    url: '/sample-report',
    type: 'article',
  },
};

/* ──────────────────────────────────────────────────────────────────────────
   The clock ranges, scores and ruling planets below come from SAMPLE_GRID —
   real output from the deterministic ephemeris engine for one fixed sample
   birth (see src/components/landing/sampleData.ts). The same data drives the
   landing-page preview, so this page and the landing chart can never disagree.

   The one-line guidance is editorial: a plain-English reading of each window,
   written to match its ruling planet and its score. Keyed by slot label so a
   regenerated grid can never silently pair a line with the wrong hour.
   ────────────────────────────────────────────────────────────────────────── */
const GUIDANCE: Record<string, string> = {
  '06:00–07:00': 'A calm, clear-headed start. Good for planning the day or writing the message you keep rehearsing.',
  '07:00–08:00': 'Heavier than it looks. Do the dull admin now, not anything that needs charm.',
  '08:00–09:00': 'Fine for learning and advice. Ask someone further along than you an honest question.',
  '09:00–10:00': "The morning's best hour. Take the meeting you've been dodging, or ship the thing that's nearly done.",
  '10:00–11:00': 'Good for being seen — a pitch, a demo, or asking your boss for something.',
  '11:00–12:00': 'Pleasant but unfocused. Better for a coffee with someone than for a decision.',
  '12:00–13:00': "The dip. Eat, walk, clear easy messages. Don't sign anything in this hour.",
  '13:00–14:00': 'Steadier again. A decent slot for a one-to-one where feelings are part of it.',
  '14:00–15:00': 'Grind time. Head down on the work nobody claps for, and keep people out of it.',
  '15:00–16:00': "Still heavy going. If you're stuck, change the task rather than push harder.",
  '16:00–17:00': "Everything opens up. Money talk, teaching, mentoring, or asking for what you're worth.",
  '17:00–18:00': "The peak of the day. Whatever you've been putting off — the hard conversation, the ask — do it here.",
  '18:00–19:00': 'A strong close to the working day. Confirm, wrap up, be decisive where people can see it.',
  '19:00–20:00': 'Low and scattered. A poor hour to negotiate, or to raise something tender at home.',
  '20:00–21:00': 'Fine for small errands and light admin. Nothing that needs your best judgement.',
  '21:00–22:00': 'Warm and easy. The right hour for family, a real conversation, or something you do for joy.',
  '22:00–23:00': 'Good for reading, reflecting, and making peace with how the day actually went.',
  '23:00–24:00': 'Still has energy in it — spend it winding down, not starting something new.',
};

/* One canonical 5-tier scale (docs/DESIGN_SYSTEM.md §1). Colour is never the
   only signal — every row also carries the tier word.
   `text` is used for the word and the number and must clear AA on parchment,
   so `favourable` sits one step deeper than the spec's #3B8C63 (3.85:1).
   `accent` is decorative (rail + legend dot) and keeps the spec's lighter
   value, so the two green tiers stay distinguishable at a glance. */
type Tier = { word: string; text: string; accent: string; tint: string };

const TIERS: { min: number; tier: Tier }[] = [
  { min: 80, tier: { word: 'Strong', text: '#226B48', accent: '#226B48', tint: 'rgba(34,107,72,0.10)' } },
  { min: 60, tier: { word: 'Favourable', text: '#2E7A52', accent: '#5FAE86', tint: 'rgba(59,140,99,0.09)' } },
  { min: 40, tier: { word: 'Mixed', text: '#8A6318', accent: '#C79A3C', tint: 'rgba(138,99,24,0.09)' } },
  { min: 20, tier: { word: 'Guarded', text: '#A9541F', accent: '#D08050', tint: 'rgba(169,84,31,0.10)' } },
  { min: 0, tier: { word: 'Avoid', text: '#8E3418', accent: '#C05B38', tint: 'rgba(142,52,24,0.11)' } },
];

function tierOf(score: number): Tier {
  return (TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1]).tier;
}

/** "15 Jun 1992 · 09:00 · New Delhi" → "… · 9:00 am · …". Never 24-hour. */
function to12h(label: string): string {
  return label.replace(/\b(\d{2}):(\d{2})\b/g, (_match, h: string, m: string) => {
    const hr = Number(h);
    return `${hr % 12 === 0 ? 12 : hr % 12}:${m} ${hr < 12 ? 'am' : 'pm'}`;
  });
}

/** "06:00–07:00" → "6 – 7 am"; "11:00–12:00" → "11 am – 12 pm". Never 24-hour. */
function formatRange(label: string): string {
  const [from, to] = label.split('–').map((p) => Number(p.slice(0, 2)));
  const clock = (h: number) => {
    const norm = h % 24;
    return norm % 12 === 0 ? 12 : norm % 12;
  };
  const meridiem = (h: number) => (h % 24 < 12 ? 'am' : 'pm');
  return meridiem(from) === meridiem(to)
    ? `${clock(from)} – ${clock(to)} ${meridiem(to)}`
    : `${clock(from)} ${meridiem(from)} – ${clock(to)} ${meridiem(to)}`;
}

const RANKED = [...SAMPLE_GRID].sort((a, b) => b.score - a.score);
const BEST_TWO = RANKED.slice(0, 2);
const HARDEST = RANKED[RANKED.length - 1];
const DAY_TIER = tierOf(SAMPLE_DAY_SCORE);

const LEGEND = [
  { ...TIERS[0].tier, range: '80–100' },
  { ...TIERS[1].tier, range: '60–79' },
  { ...TIERS[2].tier, range: '40–59' },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-amber/30 bg-amber/[0.08] px-3 py-1.5 font-body text-body-md text-amber-light">
      {children}
    </span>
  );
}

export default function SampleReportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-space">
      {/* ── NIGHT cover ──────────────────────────────────────────────── */}
      <header
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8"
        style={{
          background:
            'radial-gradient(120% 90% at 50% -10%, #2A1C42 0%, #120C1E 55%, #0A0713 100%)',
        }}
      >
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            aria-label="VedicHour home"
          >
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" className="shrink-0 text-amber" aria-hidden>
              <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
              <circle cx="14" cy="14" r="3" fill="currentColor" />
            </svg>
            <span className="font-display text-lg font-semibold tracking-wide text-star">VedicHour</span>
          </Link>

          <p className="mt-9 font-body text-body-md text-indigo">Sample report · one real chart, one real day</p>
          <h1 className="mt-2 font-display text-display-md text-star">A full day, hour by hour</h1>
          <p className="mt-4 font-body text-body-lg leading-relaxed text-dust-light">
            Every hour scored, and one plain line telling you what that window is good for. The times,
            the scores and the ruling planets are all computed from a real birth chart.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <Pill>{SAMPLE_SEEKER.lagna} rising</Pill>
            <Pill>
              Moon in {SAMPLE_SEEKER.moonSign} · {SAMPLE_SEEKER.moonNakshatra}
            </Pill>
          </div>
          <p className="mt-4 font-body text-body-md text-dust">
            Sample birth: {to12h(SAMPLE_SEEKER.birthLabel)}. Day shown: {SAMPLE_SEEKER.sampleDayLabel}.
          </p>
        </div>
      </header>

      {/* ── PAPER reading canvas ─────────────────────────────────────── */}
      <main
        id="main-content"
        className="-mt-6 flex-1 rounded-[24px] bg-parchment px-4 pb-14 pt-8 sm:px-6 sm:pt-10"
      >
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h2 className="font-display text-headline-lg text-ink">{SAMPLE_SEEKER.sampleDayLabel}</h2>
            <span
              className="inline-flex items-center gap-2 rounded-pill px-3 py-1.5 font-body text-body-md font-medium"
              style={{ background: DAY_TIER.tint, color: DAY_TIER.text }}
            >
              {DAY_TIER.word} day
              <span aria-hidden className="h-3 w-px" style={{ background: 'rgba(30,23,38,0.18)' }} />
              <span className="tabular-nums">{SAMPLE_DAY_SCORE}</span>
            </span>
          </div>

          <p className="mt-3 font-body text-body-lg leading-relaxed text-ink-muted">
            Two windows carry this day — {formatRange(BEST_TWO[1].label)} and {formatRange(BEST_TWO[0].label)}.
            The hour to protect yourself from is {formatRange(HARDEST.label)}.
          </p>

          {/* Legend — colour is a cue, the word is the answer */}
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-y border-paper-line py-3">
            {LEGEND.map((l) => (
              <li key={l.word} className="flex items-center gap-2">
                <span aria-hidden className="h-2.5 w-2.5 rounded-pill" style={{ background: l.accent }} />
                <span className="font-body text-body-md text-ink-soft">
                  <span style={{ color: l.text }}>{l.word}</span>{' '}
                  <span className="tabular-nums">{l.range}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* The 18 windows */}
          <ol className="mt-6 space-y-3">
            {SAMPLE_GRID.map((slot) => {
              const tier = tierOf(slot.score);
              return (
                <li
                  key={slot.label}
                  className="rounded-[1rem] border border-paper-line bg-white p-4 shadow-[0_1px_2px_rgba(60,44,28,0.06)]"
                  style={{ borderLeftWidth: '3px', borderLeftColor: tier.accent }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <p className="font-body text-headline-sm tabular-nums text-ink">{formatRange(slot.label)}</p>
                    <span
                      className="inline-flex items-center gap-2 rounded-pill px-3 py-1 font-body text-body-md font-medium"
                      style={{ background: tier.tint, color: tier.text }}
                    >
                      {tier.word}
                      <span aria-hidden className="h-3 w-px" style={{ background: 'rgba(30,23,38,0.18)' }} />
                      <span className="tabular-nums">{slot.score}</span>
                    </span>
                  </div>
                  <p className="mt-1 font-body text-body-md text-ink-soft">{slot.hora} hour</p>
                  <p className="mt-2 font-body text-body-lg leading-relaxed text-ink-muted">
                    {GUIDANCE[slot.label]}
                  </p>
                </li>
              );
            })}
          </ol>

          <p className="mt-8 font-body text-body-md leading-relaxed text-ink-soft">
            Your own report covers every day you buy, in your city&apos;s local time — calculated from real
            astronomical data, the same math a careful astrologer uses. It is written to help you think, not
            to promise outcomes.
          </p>
        </div>
      </main>

      {/* ── NIGHT close + CTA ────────────────────────────────────────── */}
      <section
        className="px-4 py-14 sm:px-6 sm:py-16"
        style={{
          background: 'radial-gradient(110% 100% at 50% 110%, #2A1C42 0%, #120C1E 60%, #0A0713 100%)',
        }}
      >
        <div className="mx-auto w-full max-w-2xl text-center">
          <h2 className="font-display text-display-md text-star">Now do this for your own day</h2>
          <p className="mx-auto mt-3 max-w-md font-body text-body-lg leading-relaxed text-dust-light">
            Your birth details, your city, your hours. The chart is free and takes about a minute.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3">
            {/* Primary CTA is the same free path the navbar uses (UNLOCK_FREE_HREF).
                /free-kundli is an SEO landing page, not the entry to the flow —
                sending the highest-intent reader there added a hop. It stays in
                the footer nav for search traffic. */}
            <Link href={UNLOCK_FREE_HREF} className="btn-primary min-h-[3rem] w-full max-w-xs text-base">
              See your own day — free
            </Link>
            <Link href="/pricing" className="btn-secondary min-h-[3rem] w-full max-w-xs">
              Compare full reports
            </Link>
          </div>
          <p className="mt-6 font-body text-body-md text-dust">No card needed for the free chart.</p>
        </div>
      </section>

      <Footer />

      <JsonLd
        data={[
          softwareAppLd({
            name: 'VedicHour Hourly Timing Report',
            path: '/sample-report',
            description:
              'Sample Vedic day timing report showing all 18 hourly windows for one birth chart, each scored 0–100 and explained in plain English.',
            price: '0',
          }),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Sample report', path: '/sample-report' },
          ]),
        ]}
      />
    </div>
  );
}
