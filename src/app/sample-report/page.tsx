import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import Footer from '@/components/shared/Footer';
import { JsonLd } from '@/components/seo/JsonLd';
import { PersonalBrief } from '@/components/report/PersonalBrief';
import { breadcrumbLd, softwareAppLd } from '@/lib/seo/jsonLd';
import { SECTION_NAME, type ForecastKey } from '@/lib/personalization/forecastView';
import { UNLOCK_FREE_HREF } from '@/lib/pricing';
import {
  ANTARDASHAS,
  AREAS,
  BRIEF,
  CHART,
  CURRENT_ANTARDASHA,
  DAILY_NOTES,
  DAYS,
  EVENT_DATE,
  EVENT_DAY,
  FIRST_MONTH,
  HOURLY,
  MAHADASHA,
  MONTH_ROWS,
  MOON,
  MOON_SIGN_MARGIN_MINUTES,
  NATIVITY,
  QUIETEST_DAYS,
  READER_NAME,
  SAMPLE_FORECAST,
  SECTION_ORDER,
  STRONGEST_DAYS,
  SYNTHESIS,
  WEEKS,
  WINDOW_AVERAGE,
  calendarRows,
  dayTier,
  formatClockRange,
  formatRange,
  noteBlocks,
  plainDate,
  shortDate,
  splitHourly,
  tierOf,
  whyLine,
} from '@/components/landing/sampleReportView';

const WINDOW = SAMPLE_FORECAST.window;
const WINDOW_LABEL = `${plainDate(WINDOW.start).replace(/ 20\d\d$/, '')} to ${plainDate(WINDOW.end)}`;

export const metadata: Metadata = {
  title: 'Sample Vedic Astrology Forecast Report: 30 Days, Hour by Hour',
  description:
    'A finished VedicHour forecast for one chart: life-area scores, the best and hardest days, the dasha chapter, a week-by-week plan and every hour of an interview day, with the honest limits of each.',
  alternates: { canonical: '/sample-report' },
  openGraph: {
    title: 'Sample Vedic Astrology Forecast Report: 30 Days, Hour by Hour',
    description:
      'One reader, one real chart, one month: what a VedicHour forecast looks like when it is written around the answers you gave.',
    url: '/sample-report',
    type: 'article',
  },
};

/* ──────────────────────────────────────────────────────────────────────────
   Everything below comes from src/components/landing/sampleForecast.ts, which
   scripts/gen-sample-forecast.ts writes: the chart, the dasha and the 30 days of
   scores are the deterministic engine's (Lahiri), and the sentences are what the
   report's own writing routes returned for the invented reader's quiz answers
   (src/components/landing/sampleReader.ts). The brief at the top, the order of
   the sections and each "why this is in your report" line use the same functions
   the paid report page uses. Nothing here is fetched, so the page renders
   statically for ad capture and crawlers.
   ────────────────────────────────────────────────────────────────────────── */

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-amber/30 bg-amber/[0.08] px-3 py-1.5 font-body text-body-md text-amber-light">
      {children}
    </span>
  );
}

/** Colour is a cue; the word and the number are the answer. */
function ScoreBadge({ score, word, tint, text }: { score: number; word: string; tint: string; text: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-pill px-3 py-1 font-body text-body-md font-medium"
      style={{ background: tint, color: text }}
    >
      {word}
      <span aria-hidden className="h-3 w-px" style={{ background: 'rgba(30,23,38,0.18)' }} />
      <span className="tabular-nums">{score}</span>
    </span>
  );
}

function DayBadge({ score }: { score: number }) {
  const t = dayTier(score);
  return <ScoreBadge score={score} word={t.word} tint={t.tint} text={t.text} />;
}

/** Weeks, months and life areas: the five-tier words. Days carry the report's own day words (DayBadge). */
function TierBadge({ score }: { score: number }) {
  const t = tierOf(score);
  return <ScoreBadge score={score} word={t.word} tint={t.tint} text={t.text} />;
}

/** The one line under a section's title that says which answer put the section here. */
function WhyLine({ k }: { k: ForecastKey }) {
  const text = whyLine(k);
  if (!text) return null;
  return (
    <p className="mt-2 font-body text-body-md italic leading-relaxed text-ink-soft" data-testid="why-here">
      <span className="font-medium not-italic text-ink-muted">Why this is in your report: </span>
      {text}
    </p>
  );
}

function SectionHead({ k, title, children }: { k: ForecastKey; title: string; children?: ReactNode }) {
  return (
    <header>
      <h2 className="font-display text-headline-lg text-ink">{title}</h2>
      <WhyLine k={k} />
      {children}
    </header>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <p className="font-body text-body-lg leading-relaxed text-ink-muted">{children}</p>;
}

/* ── Your chapter ─────────────────────────────────────────────────────────── */

function ChapterSection() {
  const now = CURRENT_ANTARDASHA;
  return (
    <section aria-labelledby="chapter" className="mt-12 first:mt-0">
      <h2 id="chapter" className="font-display text-headline-lg text-ink">
        The chapter you are in
      </h2>
      <p className="mt-2 font-body text-body-md italic leading-relaxed text-ink-soft" data-testid="why-here">
        <span className="font-medium not-italic text-ink-muted">Why this is in your report: </span>
        Every score below is read against this chart and this chapter of it, so it comes first.
      </p>

      <div className="mt-5 rounded-[1rem] border border-paper-line bg-white p-5 shadow-[0_1px_2px_rgba(60,44,28,0.06)]">
        <p className="font-body text-body-md text-ink-soft">Your main period</p>
        <p className="mt-1 font-display text-headline-md text-ink">
          {MAHADASHA.lord} · {plainDate(MAHADASHA.start)} to {plainDate(MAHADASHA.end)}
        </p>
        <p className="mt-1 font-body text-body-md text-ink-muted">
          Inside it, the {now.lord} sub-period runs until {plainDate(now.end)}.
        </p>
        <ol className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-3" aria-label="The sub-periods before, during and after this one">
          {ANTARDASHAS.filter((_, i) => Math.abs(i - ANTARDASHAS.findIndex((x) => x.start === now.start)) <= 1).map((a) => {
            const active = a.lord === now.lord && a.start === now.start;
            return (
              <li
                key={a.lord + a.start}
                className="rounded-[0.75rem] border px-3 py-2 font-body text-body-md"
                style={{
                  borderColor: active ? '#B5862F' : '#E6DBCB',
                  background: active ? 'rgba(181,134,47,0.10)' : 'transparent',
                  color: active ? '#8A6318' : '#66596F',
                }}
                aria-current={active ? 'true' : undefined}
              >
                <span className="font-medium">{a.lord}</span>
                <span className="tabular-nums"> · {plainDate(a.start).replace(/^\d+ /, '')} to {plainDate(a.end).replace(/^\d+ /, '')}</span>
                {active ? <span className="ml-2 font-medium">now</span> : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-6 space-y-4">
        <h3 className="font-display text-headline-sm text-ink">What it means for you now</h3>
        <Prose>{NATIVITY.dashaInterpretation}</Prose>
        <h3 className="pt-2 font-display text-headline-sm text-ink">About your chart</h3>
        <Prose>{NATIVITY.lagnaAnalysis}</Prose>
      </div>
    </section>
  );
}

/* ── Timing by area of life ───────────────────────────────────────────────── */

function DecideSection() {
  const rows = calendarRows();
  return (
    <section aria-labelledby="decide" className="mt-14">
      <SectionHead k="decide" title={SECTION_NAME.decide} />

      <h3 className="mt-6 font-display text-headline-sm text-ink">{FIRST_MONTH.label}, by area of life</h3>
      <p className="mt-1 font-body text-body-md text-ink-soft">{FIRST_MONTH.theme}</p>
      <ul className="mt-4 space-y-3" aria-label="Life-area scores for the month">
        {AREAS.map((a) => {
          const t = tierOf(a.score);
          return (
            <li key={a.name} className="flex items-center gap-3">
              <span className="w-28 shrink-0 font-body text-body-md text-ink-muted">{a.name}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-pill" style={{ background: 'rgba(30,23,38,0.07)' }}>
                <span className="block h-full rounded-pill" style={{ width: `${a.score}%`, background: t.accent }} />
              </span>
              <span className="w-28 shrink-0 text-right font-body text-body-md tabular-nums" style={{ color: t.text }}>
                {a.score} · {t.word}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 font-body text-body-md text-ink-soft">
        Month and life-area scores are estimates from the month&apos;s main planetary movements. Day and hour scores below are calculated.
      </p>

      <h3 className="mt-9 font-display text-headline-sm text-ink">The 30 days, day by day</h3>
      <p className="mt-1 font-body text-body-md text-ink-soft">
        Average {WINDOW_AVERAGE}. The date she told us about is outlined.
      </p>
      <div className="mt-4" role="table" aria-label="Day scores for the 30 days">
        <div role="row" className="grid grid-cols-7 gap-1.5 pb-1.5 text-center font-body text-body-sm text-ink-soft">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d} role="columnheader">
              {d}
            </span>
          ))}
        </div>
        {rows.map((row, ri) => (
          <div key={ri} role="row" className="mb-1.5 grid grid-cols-7 gap-1.5">
            {row.map((d, ci) => {
              if (!d) return <span key={ci} role="cell" aria-hidden />;
              const t = dayTier(d.score);
              const isEvent = d.date === EVENT_DATE;
              return (
                <span
                  key={d.date}
                  role="cell"
                  className="flex flex-col items-center rounded-[0.5rem] py-1.5 font-body leading-tight"
                  style={{ background: t.tint, color: t.text, outline: isEvent ? '2px solid #B5862F' : 'none', outlineOffset: '1px' }}
                  aria-label={`${shortDate(d.date)}: ${d.score}, ${t.word}${isEvent ? ', your interview' : ''}`}
                >
                  <span className="text-body-sm opacity-80">{Number(d.date.slice(8))}</span>
                  <span className="text-body-md font-medium tabular-nums">{d.score}</span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Week by week ─────────────────────────────────────────────────────────── */

function WeeklySection() {
  return (
    <section aria-labelledby="weekly" className="mt-14">
      <SectionHead k="weekly" title={SECTION_NAME.weekly} />
      <ol className="mt-5 space-y-3">
        {WEEKS.map((w) => (
          <li key={w.label} className="rounded-[1rem] border border-paper-line bg-white p-4 shadow-[0_1px_2px_rgba(60,44,28,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <p className="font-body text-headline-sm tabular-nums text-ink">{w.label}</p>
              <TierBadge score={w.score} />
            </div>
            <p className="mt-2 font-body text-body-lg leading-relaxed text-ink-muted">{w.theme}</p>
            {w.analysis ? <p className="mt-3 font-body text-body-lg leading-relaxed text-ink-muted">{w.analysis}</p> : null}
            <p className="mt-3 font-body text-body-md text-ink-soft">
              <span className="font-medium text-ink-muted">Best: </span>
              {w.best.replace(/^Best:\s*/i, '')}
            </p>
            <p className="font-body text-body-md text-ink-soft">
              <span className="font-medium text-ink-muted">Hardest: </span>
              {w.worst.replace(/^Worst:\s*/i, '')}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── Month by month ───────────────────────────────────────────────────────── */

function MonthlySection() {
  return (
    <section aria-labelledby="monthly" className="mt-14">
      <SectionHead k="monthly" title={SECTION_NAME.monthly} />
      <ol className="mt-5 space-y-3">
        {MONTH_ROWS.map((m, i) => (
          <li key={m.label} className="rounded-[1rem] border border-paper-line bg-white p-4 shadow-[0_1px_2px_rgba(60,44,28,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <p className="font-body text-headline-sm text-ink">{m.label}</p>
              <TierBadge score={m.overall} />
            </div>
            <p className="mt-2 font-body text-body-lg leading-relaxed text-ink-muted">{m.theme}</p>
            {i === 0 ? (
              <div className="mt-3 space-y-3">
                {[m.opening, m.movements, m.closing].filter(Boolean).map((t, j) => (
                  <p key={j} className="font-body text-body-lg leading-relaxed text-ink-muted">
                    {t}
                  </p>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-4 font-body text-body-md text-ink-soft">
        Shown: the first four of twelve months. Your own report covers a full year, each month with its movements, its best and hardest stretch, and one thing to do.
      </p>
    </section>
  );
}

/* ── Day by day, hour by hour ─────────────────────────────────────────────── */

function NoteCard({ date, theme, overview }: { date: string; theme: string; overview: string }) {
  const blocks = noteBlocks(overview);
  const day = DAYS.find((d) => d.date === date);
  return (
    <article className="rounded-[1rem] border border-paper-line bg-white p-4 shadow-[0_1px_2px_rgba(60,44,28,0.06)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 className="font-display text-headline-sm text-ink">{shortDate(date)}</h3>
        {day ? <DayBadge score={day.score} /> : null}
      </div>
      <p className="mt-1 font-body text-body-md text-ink-soft">{theme}</p>
      <div className="mt-3 space-y-3">
        {blocks.map((b, i) => {
          if (b.kind === 'h') return <h4 key={i} className="pt-1 font-body text-body-md font-medium text-ink">{b.text}</h4>;
          if (b.kind === 'li')
            return (
              <p key={i} className="border-l-2 pl-3 font-body text-body-lg leading-relaxed text-ink-muted" style={{ borderColor: '#D6C8B3' }}>
                {b.text}
              </p>
            );
          return (
            <p key={i} className="font-body text-body-lg leading-relaxed text-ink-muted">
              {b.text}
            </p>
          );
        })}
      </div>
    </article>
  );
}

function DailySection() {
  return (
    <section aria-labelledby="daily" className="mt-14">
      <SectionHead k="daily" title={SECTION_NAME.daily} />
      <div className="mt-5 space-y-4">
        {DAILY_NOTES.map((n) => (
          <NoteCard key={n.date} date={n.date} theme={n.theme} overview={n.overview} />
        ))}
      </div>

      <h3 className="mt-10 font-display text-headline-sm text-ink">
        All 18 windows of {shortDate(EVENT_DATE)}, the day of the interview
      </h3>
      <p className="mt-1 font-body text-body-md text-ink-soft">
        {SAMPLE_FORECAST.window.city}. Rahu Kaal is {EVENT_DAY.rahuKaal ? formatClockRange(EVENT_DAY.rahuKaal) : 'marked'}. Open a window for its full note.
      </p>
      <ol className="mt-5 space-y-3">
        {EVENT_DAY.slots.map((slot, i) => {
          const tier = tierOf(slot.score);
          const note = HOURLY[i];
          return (
            <li
              key={slot.label}
              className="rounded-[1rem] border border-paper-line bg-white p-4 shadow-[0_1px_2px_rgba(60,44,28,0.06)]"
              style={{ borderLeftWidth: '3px', borderLeftColor: tier.accent }}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <p className="font-body text-headline-sm tabular-nums text-ink">{formatRange(slot.label)}</p>
                <ScoreBadge score={slot.score} word={tier.word} tint={tier.tint} text={tier.text} />
              </div>
              <p className="mt-1 font-body text-body-md text-ink-soft">
                {slot.hora} hour · {slot.chog} choghadiya
                {slot.rahuKaal ? ' · Rahu Kaal' : ''}
              </p>
              {note ? (() => {
                const h = splitHourly(note.full);
                return (
                  <>
                    {h.action ? <p className="mt-2 font-body text-body-lg leading-relaxed text-ink-muted">{h.action}</p> : null}
                    <details className="mt-2">
                      <summary className="cursor-pointer list-none font-body text-body-md font-medium marker:content-none" style={{ color: '#8A6318' }}>
                        More about this hour
                      </summary>
                      <div className="mt-2 space-y-2">
                        <p className="font-body text-body-md leading-relaxed text-ink-soft">{h.role}</p>
                        {h.more.map((para, j) => (
                          <p key={j} className="font-body text-body-md leading-relaxed text-ink-muted">
                            {para}
                          </p>
                        ))}
                      </div>
                    </details>
                  </>
                );
              })() : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ── Strongest and quietest dates ─────────────────────────────────────────── */

function SynthesisSection() {
  return (
    <section aria-labelledby="synthesis" className="mt-14">
      <SectionHead k="synthesis" title={SECTION_NAME.synthesis} />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1rem] border border-paper-line bg-white p-4 shadow-[0_1px_2px_rgba(60,44,28,0.06)]">
          <h3 className="font-display text-headline-sm text-ink">Strongest days</h3>
          <ul className="mt-3 space-y-3">
            {STRONGEST_DAYS.map((d) => (
              <li key={d.date}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-body text-body-lg font-medium text-ink">{shortDate(d.date)}</span>
                  <DayBadge score={d.score} />
                </div>
                <p className="mt-1 font-body text-body-md text-ink-soft">
                  {d.date === EVENT_DATE ? 'Her interview. ' : ''}
                  Best hours: {d.hours.map(formatRange).join(', ') || 'none clear of Rahu Kaal'}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[1rem] border border-paper-line bg-white p-4 shadow-[0_1px_2px_rgba(60,44,28,0.06)]">
          <h3 className="font-display text-headline-sm text-ink">Quietest days</h3>
          <ul className="mt-3 space-y-3">
            {QUIETEST_DAYS.map((d) => (
              <li key={d.date}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-body text-body-lg font-medium text-ink">{shortDate(d.date)}</span>
                  <DayBadge score={d.score} />
                </div>
                <p className="mt-1 font-body text-body-md text-ink-soft">Keep it for rest and routine tasks; sign nothing.</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Prose>{SYNTHESIS.opening}</Prose>
        <h3 className="pt-2 font-display text-headline-sm text-ink">Career</h3>
        <Prose>{SYNTHESIS.career}</Prose>
        <h3 className="pt-2 font-display text-headline-sm text-ink">Money</h3>
        <Prose>{SYNTHESIS.money}</Prose>
        <Prose>{SYNTHESIS.closing}</Prose>
      </div>
    </section>
  );
}

/* ── The limits, said plainly ─────────────────────────────────────────────── */

function LimitsSection() {
  const items: { head: string; body: string }[] = [
    {
      head: 'It is a timing guide, not a prediction.',
      body: 'A strong day makes a conversation easier; it does not make the answer yes. A quiet day forbids nothing. Use the scores to choose when, not whether.',
    },
    {
      head: 'The days and hours are calculated. The months are broader estimates.',
      body: 'Each hour comes from the planetary hour, the Choghadiya, Rahu Kaal and the rising sign at that hour, set against this chart. A month or a life-area score is a judgement from that month’s main planetary movements, and the further out a month is, the broader it gets.',
    },
    {
      head: 'Your birth time matters.',
      body: `This sample’s Moon sits at ${MOON.degree.toFixed(1)} degrees of ${MOON.sign}, about ${MOON_SIGN_MARGIN_MINUTES} minutes of birth time away from changing sign. That would move ${CHART.moonNakshatra} to another star and shift every score. If your birth time is a guess, your report says so at the top and tells you how far to trust the hours.`,
    },
    {
      head: 'It is not medical, legal or financial advice.',
      body: 'The health and money notes are about timing and attention. They are not treatment, and they are not a reason to buy, sell, sign or stop anything on their own.',
    },
    {
      head: 'It sells nothing.',
      body: `${READER_NAME} told us pressure to buy things had put her off astrology, so her report suggests no gemstone, ritual or purchase. Yours follows what you tell us.`,
    },
    {
      head: 'The sentences are written by software, from the calculated facts.',
      body: 'The positions, dates, scores and times are computed with the Swiss Ephemeris and the Lahiri ayanamsa. The wording around them is generated and can be imprecise. When a sentence and a number disagree, trust the number and tell us.',
    },
  ];
  return (
    <section aria-labelledby="limits" className="mt-14">
      <h2 id="limits" className="font-display text-headline-lg text-ink">
        What this report cannot do
      </h2>
      <ul className="mt-5 space-y-4">
        {items.map((it) => (
          <li key={it.head} className="rounded-[1rem] border border-paper-line bg-white p-4 shadow-[0_1px_2px_rgba(60,44,28,0.06)]">
            <p className="font-body text-body-lg font-medium text-ink">{it.head}</p>
            <p className="mt-1 font-body text-body-lg leading-relaxed text-ink-muted">{it.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

const SECTION_VIEW: Record<string, () => JSX.Element> = {
  decide: DecideSection,
  weekly: WeeklySection,
  monthly: MonthlySection,
  daily: DailySection,
  synthesis: SynthesisSection,
};

export default function SampleReportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-space">
      {/* ── NIGHT cover ──────────────────────────────────────────────── */}
      <header
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8"
        style={{ background: 'radial-gradient(120% 90% at 50% -10%, #2A1C42 0%, #120C1E 55%, #0A0713 100%)' }}
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

          <p className="mt-9 font-body text-body-md text-indigo">Sample report · an invented reader, a real chart</p>
          <h1 className="mt-2 font-display text-display-md text-star">{READER_NAME}&apos;s next 30 days</h1>
          <p className="mt-4 font-body text-body-lg leading-relaxed text-dust-light">
            One finished forecast, as a member reads it. {READER_NAME} is made up. Her chart is a real calculation, and every score,
            hour and date below comes from it. The sentences were written for the answers she gave when she signed up.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <Pill>{CHART.lagna} rising</Pill>
            <Pill>
              Moon in {MOON.sign} · {CHART.moonNakshatra}
            </Pill>
            <Pill>{MAHADASHA.lord} period</Pill>
          </div>
          <p className="mt-4 font-body text-body-md text-dust">
            Sample birth: 15 Jun 1992, 9:00 am, New Delhi. Window: {WINDOW_LABEL}, in {WINDOW.city}.
          </p>

          <div className="mt-8">
            <PersonalBrief brief={BRIEF} />
          </div>
        </div>
      </header>

      {/* ── PAPER reading canvas ─────────────────────────────────────── */}
      <main id="main-content" className="-mt-6 flex-1 rounded-[24px] bg-parchment px-4 pb-14 pt-8 sm:px-6 sm:pt-10">
        <div className="mx-auto w-full max-w-2xl">
          <ChapterSection />
          {SECTION_ORDER.map((k) => {
            const View = SECTION_VIEW[k];
            return View ? <View key={k} /> : null;
          })}
          <LimitsSection />
        </div>
      </main>

      {/* ── NIGHT close + CTA ────────────────────────────────────────── */}
      <section
        className="px-4 py-14 sm:px-6 sm:py-16"
        style={{ background: 'radial-gradient(110% 100% at 50% 110%, #2A1C42 0%, #120C1E 60%, #0A0713 100%)' }}
      >
        <div className="mx-auto w-full max-w-2xl text-center">
          <h2 className="font-display text-display-md text-star">Now do this for your own month</h2>
          <p className="mx-auto mt-3 max-w-md font-body text-body-lg leading-relaxed text-dust-light">
            Your birth details, your city, your question. The chart is free and takes about a minute.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3">
            {/* Primary CTA is the same free path the navbar uses (UNLOCK_FREE_HREF).
                /free-kundli is an SEO landing page, not the entry to the flow. */}
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
            name: 'VedicHour Forecast Report',
            path: '/sample-report',
            description:
              'Sample Vedic astrology forecast: 30 days of scored days and hourly windows for one birth chart, with life-area scores, the dasha chapter, a week-by-week plan and the limits of each.',
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
