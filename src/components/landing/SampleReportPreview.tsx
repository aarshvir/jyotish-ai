/**
 * SampleReportPreview — interactive teaser of what a paid report looks like.
 *
 * Three tabs (Nativity / Hourly Grid / Dasha Timeline). Every value is REAL
 * output from the deterministic ephemeris engine for one fixed sample birth
 * (see sampleData.ts — regenerate with scripts/gen-sample-data.mjs). No invented
 * numbers: the chart, dasha timeline and hourly scores are accurate engine output.
 */

'use client';

import { useState } from 'react';
import {
  SAMPLE_SEEKER,
  SAMPLE_DASHA,
  SAMPLE_GRID,
  activeDashaIndex,
} from './sampleData';

type Tab = 'nativity' | 'hourly' | 'dasha';

const TABS: { id: Tab; label: string; sublabel: string }[] = [
  { id: 'nativity', label: 'Your chart summary', sublabel: 'Rising sign · life themes' },
  { id: 'hourly', label: 'Hourly windows', sublabel: '18 precision slots per day' },
  { id: 'dasha', label: 'Life chapters', sublabel: 'Your 120-year timing arc' },
];

const DASHA_IDX = activeDashaIndex(SAMPLE_DASHA);
const CURRENT_MD = SAMPLE_DASHA[DASHA_IDX] ?? SAMPLE_DASHA[3];
const NEXT_MD = SAMPLE_DASHA[DASHA_IDX + 1];
const yr = (iso: string) => iso.slice(0, 4);

function NativityPanel() {
  const s = SAMPLE_SEEKER;
  return (
    <div className="space-y-5 text-left">
      <header>
        <p className="font-mono text-mono-sm text-amber/70 tracking-[0.15em] uppercase mb-1">
          {s.lagna} Lagna — Sample Report
        </p>
        <h3 className="font-display text-2xl text-star">
          Your Chart at a Glance
        </h3>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        {[
          { label: 'Rising sign', value: s.lagna },
          { label: 'Moon sign', value: s.moonSign },
          { label: 'Nakshatra', value: s.moonNakshatra },
          { label: 'Current period', value: CURRENT_MD.lord },
        ].map((kv) => (
          <div key={kv.label} className="bg-bg-3 rounded-md py-3 px-2 border border-horizon/30">
            <div className="font-mono text-mono-sm text-dust/50 uppercase tracking-wider">{kv.label}</div>
            <div className="font-body text-base text-amber mt-1">{kv.value}</div>
          </div>
        ))}
      </div>

      <p className="font-body text-body-md text-star/85 leading-relaxed">
        You are a <strong className="text-amber">{s.lagna}-lagna</strong> native — your lagna
        lord is the <strong className="text-amber">{s.lagnaLord}</strong>, placed in the{' '}
        {s.moonHouse}th house in {s.moonSign} ({s.moonNakshatra} nakshatra). A 5th-house Moon ties
        your identity to creativity, intelligence and the things you bring to life; in deep,
        investigative {s.moonSign} it adds emotional intensity and a research-minded focus
        <sup className="text-amber text-xs">[1]</sup>.
      </p>

      <div className="bg-amber/[0.04] border-l-2 border-amber/40 pl-4 py-3">
        <p className="font-mono text-mono-sm text-amber/80 tracking-wider uppercase mb-1.5">
          Current chapter — {CURRENT_MD.lord} period ({yr(CURRENT_MD.start)}–{yr(CURRENT_MD.end)})
        </p>
        <p className="font-body text-body-sm text-dust">
          {CURRENT_MD.theme}.
          {NEXT_MD && ` A ${NEXT_MD.lord} period opens in ${yr(NEXT_MD.start)} — ${NEXT_MD.theme.toLowerCase()}.`}
        </p>
      </div>

      <div className="border-t border-horizon/30 pt-3">
        <p className="font-mono text-mono-sm text-dust/40 italic">
          Computed from a real birth chart ({s.birthLabel}). Your report is generated from your own birth details.
        </p>
      </div>
    </div>
  );
}

function HourlyPanel() {
  const slots = SAMPLE_GRID.slice(0, 8);
  const sorted = [...slots].sort((a, b) => b.score - a.score);
  const peak = sorted[0];
  const lows = [...slots].sort((a, b) => a.score - b.score).slice(0, 2);
  const lowSet = new Set(lows.map((l) => l.label));

  const labelFor = (score: number) =>
    score >= 90 ? 'Excellent' : score >= 78 ? 'Auspicious' : score >= 58 ? 'Variable' : 'Avoid';

  return (
    <div className="text-left">
      <p className="font-mono text-mono-sm text-amber/70 tracking-[0.15em] uppercase mb-3">
        {SAMPLE_SEEKER.sampleDayLabel} · sample day
      </p>
      <h3 className="font-display text-2xl text-star mb-5">Sample · 8 of 18 daily windows</h3>

      <div className="space-y-1.5">
        {slots.map((s) => {
          const isPeak = s.label === peak.label;
          const isLow = lowSet.has(s.label);
          const bar = isPeak
            ? 'bg-success'
            : s.score >= 78
            ? 'bg-amber'
            : s.score >= 58
            ? 'bg-dust/40'
            : 'bg-caution/70';
          return (
            <div key={s.label} className="flex items-center gap-3">
              <div className="font-mono text-mono-sm text-dust/70 w-24 shrink-0">{s.label}</div>
              <div className="font-body text-body-sm text-star/80 w-20 shrink-0">{labelFor(s.score)}</div>
              <div className="font-mono text-mono-sm text-dust/50 w-16 shrink-0">{s.hora}</div>
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
          <div className="font-body text-base text-star mt-0.5">{peak.label}</div>
        </div>
        {lows.map((l) => (
          <div key={l.label} className="bg-caution/[0.06] border border-caution/30 rounded-md py-2 px-2">
            <div className="font-mono text-mono-sm text-caution uppercase tracking-wider">Avoid</div>
            <div className="font-body text-base text-star mt-0.5">{l.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashaPanel() {
  return (
    <div className="text-left">
      <p className="font-mono text-mono-sm text-amber/70 tracking-[0.15em] uppercase mb-3">
        Sample · 120-year arc · {SAMPLE_SEEKER.lagna} lagna
      </p>
      <h3 className="font-display text-2xl text-star mb-5">Your life chapters</h3>

      <ol className="space-y-3">
        {SAMPLE_DASHA.map((d, i) => {
          const current = i === DASHA_IDX;
          return (
            <li
              key={d.lord}
              className={`flex items-start gap-4 p-3 rounded-md transition-colors ${
                current
                  ? 'bg-amber/[0.08] border border-amber/40'
                  : 'bg-bg-3 border border-horizon/20'
              }`}
            >
              <div className="font-mono text-mono-sm text-dust/60 w-28 shrink-0 mt-0.5">
                {yr(d.start)} – {yr(d.end)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-body text-headline-sm ${current ? 'text-amber' : 'text-star'}`}>
                    {d.lord} period
                  </span>
                  {current && (
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber text-space">
                      Active
                    </span>
                  )}
                </div>
                <p className="font-body text-body-sm text-dust mt-1">{d.theme}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="font-mono text-mono-sm text-dust/40 italic mt-4">
        Periods computed from the Moon&apos;s birth-star position using the classical Vimshottari system.
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
          <p className="section-eyebrow">Sample report · {SAMPLE_SEEKER.lagna} rising</p>
          <h2
            id="sample-report-heading"
            className="section-title text-display-md"
          >
            See what a paid report looks like
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            Three angles into a real report — computed from an actual birth chart. Yours is generated from your exact birth details.
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
          className="bg-cosmos border border-horizon/30 rounded-card p-7 md:p-10 min-h-[480px] overflow-x-auto"
        >
          {active === 'nativity' && <NativityPanel />}
          {active === 'hourly' && <HourlyPanel />}
          {active === 'dasha' && <DashaPanel />}
        </div>

        <p className="text-center mt-7 font-mono text-mono-sm text-dust/50 tracking-wider">
          Generate your own in minutes.
        </p>
      </div>
    </section>
  );
}
