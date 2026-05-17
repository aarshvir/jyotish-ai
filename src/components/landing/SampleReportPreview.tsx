/**
 * SampleReportPreview — interactive teaser of what a paid report looks like.
 *
 * Three tabs (Nativity / Hourly Grid / Dasha Timeline). Each tab shows a
 * realistic-looking fragment of a generated report. No real user data —
 * uses Cancer lagna sample with classical Vedic detail.
 *
 * Built as a pure CSS / progressive-enhancement component: works without JS
 * (first tab visible by default).
 */

'use client';

import { useState } from 'react';

type Tab = 'nativity' | 'hourly' | 'dasha';

const TABS: { id: Tab; label: string; sublabel: string }[] = [
  { id: 'nativity', label: 'Nativity Profile', sublabel: 'Lagna analysis + yogas' },
  { id: 'hourly', label: 'Hourly Windows', sublabel: '18 ratings per day' },
  { id: 'dasha', label: 'Dasha Timeline', sublabel: 'Vimshottari 120-yr cycle' },
];

function NativityPanel() {
  return (
    <div className="space-y-5 text-left">
      <header>
        <p className="font-mono text-mono-sm text-amber/70 tracking-[0.15em] uppercase mb-1">
          Cancer Lagna — Sample Report
        </p>
        <h3 className="font-display text-2xl text-star">
          Your Chart at a Glance
        </h3>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        {[
          { label: 'Lagna', value: 'Cancer' },
          { label: 'Moon Sign', value: 'Capricorn' },
          { label: 'Current MD', value: 'Rahu' },
          { label: 'Current AD', value: 'Jupiter' },
        ].map((kv) => (
          <div key={kv.label} className="bg-bg-3 rounded-md py-3 px-2 border border-horizon/30">
            <div className="font-mono text-mono-sm text-dust/50 uppercase tracking-wider">{kv.label}</div>
            <div className="font-body text-base text-amber mt-1">{kv.value}</div>
          </div>
        ))}
      </div>

      <p className="font-body text-body-md text-star/85 leading-relaxed">
        You are a <strong className="text-amber">Cancer-lagna</strong> native — your lagna
        lord is the <strong className="text-amber">Moon</strong>, placed here in the 7th house
        in Capricorn. This combination shapes identity through relationships and partnerships:
        the 7th-house Moon makes you emotionally attuned to others and well-suited to
        collaborative, public-facing work. Ancient Vedic texts single this Moon placement out as
        a mark of magnetic interpersonal influence and steady leadership of teams
        <sup className="text-amber text-xs">[1]</sup>.
      </p>

      <div className="bg-amber/[0.04] border-l-2 border-amber/40 pl-4 py-3">
        <p className="font-mono text-mono-sm text-amber/80 tracking-wider uppercase mb-1.5">
          Current Theme — Rahu / Jupiter Period
        </p>
        <p className="font-body text-body-sm text-dust">
          A long Rahu Mahadasha (18 years) opened in 2025 — expect unconventional growth,
          foreign or scaled opportunities, and a pull toward bigger arenas. The Jupiter
          Antardasha running now softens Rahu&apos;s edge and adds wisdom, advisory work,
          and teaching as natural fits.
        </p>
      </div>

      <div className="border-t border-horizon/30 pt-3">
        <p className="font-mono text-mono-sm text-dust/40 italic">
          [1] Brihat Parashara Hora Shastra, Ch. 12 · grounded in retrieved corpus
        </p>
      </div>
    </div>
  );
}

function HourlyPanel() {
  const slots = [
    { time: '06:00–07:00', label: 'Amrit', score: 92, lord: 'Moon', tone: 'peak' },
    { time: '07:00–08:00', label: 'Shubha', score: 78, lord: 'Saturn', tone: 'good' },
    { time: '08:00–09:00', label: 'Labha', score: 84, lord: 'Jupiter', tone: 'good' },
    { time: '09:00–10:00', label: 'Char', score: 61, lord: 'Mars', tone: 'neutral' },
    { time: '10:00–11:00', label: 'Rog', score: 28, lord: 'Sun', tone: 'avoid' },
    { time: '11:00–12:00', label: 'Udveg', score: 35, lord: 'Venus', tone: 'avoid' },
    { time: '12:00–13:00', label: 'Char', score: 64, lord: 'Mercury', tone: 'neutral' },
    { time: '13:00–14:00', label: 'Labha', score: 81, lord: 'Moon', tone: 'good' },
  ];

  return (
    <div className="text-left">
      <p className="font-mono text-mono-sm text-amber/70 tracking-[0.15em] uppercase mb-3">
        Tuesday, 19 May 2026 · Bangalore
      </p>
      <h3 className="font-display text-2xl text-star mb-5">Sample · 8 of 18 daily windows</h3>

      <div className="space-y-1.5">
        {slots.map((s) => {
          const bar =
            s.tone === 'peak'
              ? 'bg-success'
              : s.tone === 'good'
              ? 'bg-amber'
              : s.tone === 'neutral'
              ? 'bg-dust/40'
              : 'bg-caution/70';
          return (
            <div key={s.time} className="flex items-center gap-3">
              <div className="font-mono text-mono-sm text-dust/70 w-24 shrink-0">{s.time}</div>
              <div className="font-body text-body-sm text-star/80 w-20 shrink-0">{s.label}</div>
              <div className="font-mono text-mono-sm text-dust/50 w-16 shrink-0">{s.lord}</div>
              <div className="flex-1 h-2 bg-bg-3 rounded-full overflow-hidden">
                <div className={`h-full ${bar} rounded-full`} style={{ width: `${s.score}%` }} />
              </div>
              <div className="font-mono text-mono-sm tabular-nums text-star/80 w-10 text-right shrink-0">
                {s.score}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="bg-success/[0.06] border border-success/30 rounded-md py-2 px-2">
          <div className="font-mono text-mono-sm text-success uppercase tracking-wider">Peak</div>
          <div className="font-body text-base text-star mt-0.5">06:00–07:00</div>
        </div>
        <div className="bg-amber/[0.06] border border-amber/30 rounded-md py-2 px-2">
          <div className="font-mono text-mono-sm text-amber uppercase tracking-wider">Avoid</div>
          <div className="font-body text-base text-star mt-0.5">10:00–12:00</div>
        </div>
        <div className="bg-bg-3 border border-horizon/30 rounded-md py-2 px-2">
          <div className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider">Rahu Kaal</div>
          <div className="font-body text-base text-star mt-0.5">15:00–16:30</div>
        </div>
      </div>
    </div>
  );
}

function DashaPanel() {
  const dashas = [
    { lord: 'Moon', from: '2008', to: '2018', current: false, theme: 'Inner formation, family' },
    { lord: 'Mars', from: '2018', to: '2025', current: false, theme: 'Action, ambition spike' },
    { lord: 'Rahu', from: '2025', to: '2043', current: true, theme: 'Foreign, scale, unconventional gains' },
    { lord: 'Jupiter', from: '2043', to: '2059', current: false, theme: 'Wisdom, recognition, family-house' },
    { lord: 'Saturn', from: '2059', to: '2078', current: false, theme: 'Discipline, legacy, longevity' },
  ];

  return (
    <div className="text-left">
      <p className="font-mono text-mono-sm text-amber/70 tracking-[0.15em] uppercase mb-3">
        Vimshottari · 120-year cycle
      </p>
      <h3 className="font-display text-2xl text-star mb-5">Your Life Chapters</h3>

      <ol className="space-y-3">
        {dashas.map((d) => (
          <li
            key={d.lord}
            className={`flex items-start gap-4 p-3 rounded-md transition-colors ${
              d.current
                ? 'bg-amber/[0.08] border border-amber/40'
                : 'bg-bg-3 border border-horizon/20'
            }`}
          >
            <div className="font-mono text-mono-sm text-dust/60 w-28 shrink-0 mt-0.5">
              {d.from} – {d.to}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-body text-headline-sm ${d.current ? 'text-amber' : 'text-star'}`}>
                  {d.lord} Mahadasha
                </span>
                {d.current && (
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber text-space">
                    Active
                  </span>
                )}
              </div>
              <p className="font-body text-body-sm text-dust mt-1">{d.theme}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="font-mono text-mono-sm text-dust/40 italic mt-4">
        Vimshottari dasha periods computed from Moon&apos;s nakshatra at birth · Lahiri ayanamsa
      </p>
    </div>
  );
}

export default function SampleReportPreview() {
  const [active, setActive] = useState<Tab>('nativity');

  return (
    <section
      id="sample-report"
      aria-labelledby="sample-report-heading"
      className="py-24 md:py-28 bg-space relative"
    >
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-5xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">Sample · Cancer Lagna</p>
          <h2
            id="sample-report-heading"
            className="section-title text-display-md"
          >
            See what a paid report looks like
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            Three tabs, three angles. Plausible sample, not your data — a real Jyotish report runs ~40 pages.
          </p>
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Sample report sections"
          className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:divide-x divide-horizon/30 mb-7 bg-bg-2 border border-horizon/30 rounded-md p-1"
        >
          {TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${t.id}`}
                onClick={() => setActive(t.id)}
                className={`flex-1 px-4 py-3 rounded-sm text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
                  isActive
                    ? 'bg-amber/10 border-l-2 border-amber'
                    : 'border-l-2 border-transparent hover:bg-bg-3'
                }`}
              >
                <div
                  className={`font-body text-body-md ${isActive ? 'text-amber' : 'text-star'}`}
                >
                  {t.label}
                </div>
                <div className="font-mono text-mono-sm text-dust/50 mt-0.5">{t.sublabel}</div>
              </button>
            );
          })}
        </div>

        {/* Tab panel */}
        <div
          id={`panel-${active}`}
          role="tabpanel"
          className="bg-cosmos border border-horizon/30 rounded-card p-7 md:p-10 min-h-[480px]"
        >
          {active === 'nativity' && <NativityPanel />}
          {active === 'hourly' && <HourlyPanel />}
          {active === 'dasha' && <DashaPanel />}
        </div>

        <p className="text-center mt-7 font-mono text-mono-sm text-dust/50 tracking-wider">
          Generate your own in under 90 seconds.
        </p>
      </div>
    </section>
  );
}
