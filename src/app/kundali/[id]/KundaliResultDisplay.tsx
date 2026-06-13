'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { DashaTimeline } from '@/components/report/DashaTimeline';

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
  createdAt: string | null;
}

export function KundaliResultDisplay({
  name, lagna, moonSign, moonNakshatra, mahadasha, antardasha,
  dashaSequence, lagnaAnalysis, dashaInterpretation, createdAt,
}: Props) {
  const firstName = (name || 'Your').trim().split(/\s+/)[0] || 'Your';
  const possessive = /s$/i.test(firstName) ? `${firstName}'` : `${firstName}'s`;

  const facts = [
    { label: 'Rising sign', value: lagna },
    { label: 'Moon sign', value: moonSign },
    { label: 'Birth star', value: moonNakshatra || '—' },
    { label: 'Life period', value: `${mahadasha}${antardasha && antardasha !== 'Unknown' ? ` · ${antardasha}` : ''}` },
  ];

  return (
    <div className="space-y-12">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="section-eyebrow mb-3">Kundali Analysis</p>
        <h1 className="font-display text-display-md text-star mb-2">{possessive} birth chart</h1>
        <p className="font-mono text-mono-sm text-dust/60">
          {lagna} rising · Moon in {moonSign}
        </p>
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

      {/* The reading */}
      <div className="rounded-card border border-amber/20 bg-gradient-to-br from-amber/[0.05] via-cosmos to-cosmos p-6 sm:p-8 space-y-5">
        <div>
          <p className="font-mono text-mono-sm text-amber/70 uppercase tracking-wider mb-2">Who you are</p>
          <p className="font-body text-body-lg text-star/90 leading-relaxed">{lagnaAnalysis}</p>
        </div>
        <div className="border-t border-horizon/30 pt-5">
          <p className="font-mono text-mono-sm text-amber/70 uppercase tracking-wider mb-2">The chapter you are in</p>
          <p className="font-body text-body-md text-dust leading-relaxed">{dashaInterpretation}</p>
        </div>
      </div>

      {/* Life chapters timeline */}
      {dashaSequence.length > 0 && (
        <div className="rounded-card border border-horizon/30 bg-cosmos/40 p-6 sm:p-8">
          <DashaTimeline dashaSequence={dashaSequence} />
        </div>
      )}

      {/* Cross-sell to the timing forecast */}
      <div className="rounded-card border border-horizon/40 bg-nebula/20 p-6 text-center">
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
    </div>
  );
}
