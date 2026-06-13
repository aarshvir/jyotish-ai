'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { DashaTimeline } from '@/components/report/DashaTimeline';

interface DoshaFlag {
  present?: boolean;
  severity?: string;
  from?: string[];
  note?: string;
}

interface Props {
  name: string;
  lagna: string;
  moonSign: string;
  moonNakshatra: string;
  mahadasha: string;
  antardasha: string;
  dashaSequence: Array<{ planet: string; start_date: string; end_date: string }>;
  lagnaAnalysis: string;
  dashaInterpretation: string;
  overview?: string;
  lifeAreas?: Record<string, string>;
  yearOutlook?: Array<{ year: number; text: string }>;
  doshas?: { manglik?: DoshaFlag; kaalSarpa?: DoshaFlag; sadeSati?: DoshaFlag };
  navamsaNote?: string;
  createdAt: string | null;
}

const LIFE_AREA_ORDER: Array<{ key: string; label: string; eyebrow: string }> = [
  { key: 'life', label: 'Your life path & character', eyebrow: 'Who you are' },
  { key: 'career_finances', label: 'Career & finances', eyebrow: 'Work & money' },
  { key: 'relationships', label: 'Relationships', eyebrow: 'How you connect' },
  { key: 'marriage_intimacy', label: 'Marriage & intimacy', eyebrow: 'Partnership & closeness' },
  { key: 'health', label: 'Health & vitality', eyebrow: 'Body & energy' },
  { key: 'children', label: 'Children', eyebrow: 'Progeny' },
  { key: 'family', label: 'Family & home', eyebrow: 'Roots & belonging' },
];

function DoshaRow({ title, flag }: { title: string; flag?: DoshaFlag }) {
  const present = !!flag?.present;
  const sev = (flag?.severity ?? 'none').toLowerCase();
  const tone = !present
    ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
    : sev === 'strong'
      ? 'border-rose-500/30 bg-rose-500/[0.05]'
      : 'border-amber/30 bg-amber/[0.05]';
  const badge = !present ? 'Clear' : sev === 'strong' ? 'Present · strong' : `Present · ${sev}`;
  const badgeTone = !present ? 'text-emerald-300' : sev === 'strong' ? 'text-rose-300' : 'text-amber';
  return (
    <div className={`rounded-card border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="font-display text-base text-star">{title}</span>
        <span className={`font-mono text-mono-sm uppercase tracking-wider ${badgeTone}`}>{badge}</span>
      </div>
      {flag?.note ? <p className="font-body text-body-sm text-dust leading-relaxed">{flag.note}</p> : null}
    </div>
  );
}

export function KundaliResultDisplay({
  name, lagna, moonSign, moonNakshatra, mahadasha, antardasha,
  dashaSequence, lagnaAnalysis, dashaInterpretation, overview, lifeAreas,
  yearOutlook, doshas, navamsaNote, createdAt,
}: Props) {
  const firstName = (name || 'Your').trim().split(/\s+/)[0] || 'Your';
  const possessive = /s$/i.test(firstName) ? `${firstName}'` : `${firstName}'s`;
  const intro = (overview && overview.trim()) || lagnaAnalysis;

  const facts = [
    { label: 'Rising sign', value: lagna },
    { label: 'Moon sign', value: moonSign },
    { label: 'Birth star', value: moonNakshatra || '—' },
    { label: 'Life period', value: `${mahadasha}${antardasha && antardasha !== 'Unknown' ? ` · ${antardasha}` : ''}` },
  ];

  const areas = LIFE_AREA_ORDER
    .map((a) => ({ ...a, text: (lifeAreas?.[a.key] ?? '').trim() }))
    .filter((a) => a.text.length > 0);

  const years = (yearOutlook ?? []).filter((y) => (y?.text ?? '').trim().length > 0);
  const hasDoshas = !!(doshas && (doshas.manglik || doshas.kaalSarpa || doshas.sadeSati));

  return (
    <div className="space-y-12 kundali-report">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="section-eyebrow mb-3">Deep Kundali · Birth Chart Report</p>
        <h1 className="font-display text-display-md text-star mb-2">{possessive} birth chart, read in full</h1>
        <p className="font-mono text-mono-sm text-dust/60">
          {lagna} rising · Moon in {moonSign}{moonNakshatra ? ` (${moonNakshatra})` : ''}
        </p>
        <div className="mt-5 no-print">
          <button
            onClick={() => window.print()}
            className="btn-secondary px-5 py-2 text-sm"
          >
            Download / print PDF
          </button>
        </div>
      </motion.div>

      {/* Key facts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {facts.map((f) => (
          <div key={f.label} className="rounded-card border border-horizon/40 bg-cosmos p-4 text-center">
            <div className="font-mono text-mono-sm text-dust/50 uppercase tracking-wider mb-1">{f.label}</div>
            <div className="font-display text-lg text-amber">{f.value}</div>
          </div>
        ))}
      </div>

      {/* Overview */}
      {intro ? (
        <div className="rounded-card border border-amber/20 bg-gradient-to-br from-amber/[0.05] via-cosmos to-cosmos p-6 sm:p-8">
          <p className="font-mono text-mono-sm text-amber/70 uppercase tracking-wider mb-2">Overview</p>
          <p className="font-body text-body-lg text-star/90 leading-relaxed whitespace-pre-line">{intro}</p>
          {navamsaNote ? (
            <p className="mt-4 font-body text-body-sm text-dust/80 leading-relaxed border-t border-horizon/30 pt-4">
              {navamsaNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Doshas */}
      {hasDoshas ? (
        <div className="space-y-3">
          <p className="font-mono text-mono-sm text-amber/70 uppercase tracking-wider">Classical checks</p>
          <DoshaRow title="Mangal Dosha (Manglik)" flag={doshas?.manglik} />
          <DoshaRow title="Kaal Sarpa" flag={doshas?.kaalSarpa} />
          <DoshaRow title="Sade Sati" flag={doshas?.sadeSati} />
          <p className="font-body text-mono-sm text-dust/40 leading-relaxed">
            These traditional markers describe tendencies, not destiny — read them as areas to be conscious of, never as verdicts.
          </p>
        </div>
      ) : null}

      {/* Life-area sections — the heart of the report */}
      {areas.length > 0 && (
        <div className="space-y-6">
          {areas.map((a) => (
            <section key={a.key} className="rounded-card border border-horizon/30 bg-cosmos/40 p-6 sm:p-8 kundali-section">
              <p className="font-mono text-mono-sm text-amber/70 uppercase tracking-wider mb-1">{a.eyebrow}</p>
              <h2 className="font-display text-headline-sm text-star mb-3">{a.label}</h2>
              <p className="font-body text-body-md text-star/85 leading-relaxed whitespace-pre-line">{a.text}</p>
            </section>
          ))}
        </div>
      )}

      {/* Year-by-year outlook */}
      {years.length > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="section-eyebrow mb-2">The next five years</p>
            <h2 className="font-display text-headline-md text-star">Your year-by-year outlook</h2>
          </div>
          <div className="space-y-4">
            {years.map((y) => (
              <div key={y.year} className="rounded-card border border-horizon/30 bg-cosmos/40 p-6 kundali-section">
                <div className="font-display text-2xl text-amber mb-2">{y.year}</div>
                <p className="font-body text-body-md text-star/85 leading-relaxed whitespace-pre-line">{y.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current chapter (back-compat) */}
      {dashaInterpretation ? (
        <div className="rounded-card border border-horizon/30 bg-cosmos/40 p-6">
          <p className="font-mono text-mono-sm text-amber/70 uppercase tracking-wider mb-2">The chapter you are in now</p>
          <p className="font-body text-body-md text-dust leading-relaxed">{dashaInterpretation}</p>
        </div>
      ) : null}

      {/* Life chapters timeline */}
      {dashaSequence.length > 0 && (
        <div className="rounded-card border border-horizon/30 bg-cosmos/40 p-6 sm:p-8 no-print">
          <DashaTimeline dashaSequence={dashaSequence} />
        </div>
      )}

      {/* Cross-sell to the timing forecast */}
      <div className="rounded-card border border-horizon/40 bg-nebula/20 p-6 text-center no-print">
        <h3 className="font-display text-headline-sm text-star mb-2">Want to know your best days and hours?</h3>
        <p className="font-body text-body-sm text-dust mb-4 max-w-xl mx-auto">
          Your Kundali shows who you are. The hour-by-hour forecast shows <em>when</em> to act —
          18 precision timing windows a day for your most important decisions.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/onboard?plan=7day" className="btn-primary px-6 py-2.5 text-sm">See my timing forecast →</Link>
          <Link href="/synastry" className="btn-secondary px-5 py-2.5 text-sm">Check compatibility</Link>
        </div>
      </div>

      <p className="text-center font-mono text-mono-sm text-dust/30">
        Computed with the Swiss Ephemeris (Lahiri ayanamsa){createdAt ? ` · ${new Date(createdAt).toLocaleDateString()}` : ''}
      </p>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .kundali-report { color: #1a1a1a !important; }
          .kundali-section { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
