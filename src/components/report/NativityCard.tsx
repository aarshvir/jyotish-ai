'use client';

import { motion } from 'framer-motion';

interface NativitySummary {
  lagna_analysis: string;
  current_dasha_interpretation: string;
  key_yogas: string[];
  functional_benefics: string[];
  functional_malefics: string[];
}

interface NativityCardProps {
  name: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  lagna: string;
  lagnaDegree: number;
  moonSign: string;
  moonNakshatra: string;
  currentDasha: {
    mahadasha: string;
    antardasha: string;
  };
  nativitySummary?: NativitySummary;
}

export function NativityCard({
  name,
  birthDate,
  birthTime,
  birthCity,
  lagna,
  lagnaDegree,
  moonSign,
  moonNakshatra,
  currentDasha,
  nativitySummary,
}: NativityCardProps) {
  return (
    <motion.div
      id="nativity"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-cosmos border border-horizon rounded-sm p-8 mb-12"
    >
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Native details + analysis */}
        <div>
          <h1 className="font-display font-semibold text-star text-4xl mb-4">
            {name}
          </h1>

          <div className="font-mono text-xs text-dust mb-6">
            {birthDate} · {birthTime} · {birthCity}
          </div>

          <div className="space-y-3 mb-6">
            <div>
              <span className="font-mono text-xs text-dust tracking-[0.15em] uppercase">
                Lagna
              </span>
              <p className="font-mono text-base text-amber font-medium mt-1">
                {lagna.toUpperCase()} LAGNA · {lagnaDegree.toFixed(2)}°
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-dust tracking-[0.15em] uppercase">
                Moon
              </span>
              <p className="font-mono text-sm text-star mt-1">
                Moon in {moonSign} · {moonNakshatra}
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-dust tracking-[0.15em] uppercase">
                Dasha
              </span>
              <div className="mt-1">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber/10 border border-amber/20">
                  <span className="font-mono text-xs text-amber uppercase tracking-wider">
                    {currentDasha.mahadasha} MD · {currentDasha.antardasha} AD
                  </span>
                </span>
              </div>
            </div>
          </div>

          {nativitySummary && (
            <>
              <div className="pt-6 border-t border-horizon/40 mb-6">
                <p className="font-display text-star text-base leading-[1.8]">
                  {nativitySummary.lagna_analysis}
                </p>
              </div>

              <div className="pt-6 border-t border-horizon/40">
                <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3">
                  Current Dasha Period
                </p>
                <p className="font-display text-star text-sm leading-[1.8]">
                  {nativitySummary.current_dasha_interpretation}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Right: Yogas and functional lords */}
        <div className="space-y-6">
          {nativitySummary?.key_yogas && nativitySummary.key_yogas.length > 0 && (
            <div>
              <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3">
                Key Yogas
              </p>
              <div className="flex flex-wrap gap-2">
                {nativitySummary.key_yogas.map((yoga, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-amber/10 border border-amber/20"
                    title={yoga}
                  >
                    <span className="font-mono text-xs text-amber">
                      {yoga.split('(')[0].trim()}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {nativitySummary?.functional_benefics && nativitySummary.functional_benefics.length > 0 && (
            <div>
              <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3">
                Functional Benefics
              </p>
              <div className="flex flex-wrap gap-2">
                {nativitySummary.functional_benefics.map((planet, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald/10 border border-emerald/20"
                  >
                    <span className="font-mono text-xs text-emerald">
                      {planet}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {nativitySummary?.functional_malefics && nativitySummary.functional_malefics.length > 0 && (
            <div>
              <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3">
                Functional Malefics
              </p>
              <div className="flex flex-wrap gap-2">
                {nativitySummary.functional_malefics.map((planet, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-crimson/10 border border-crimson/20"
                  >
                    <span className="font-mono text-xs text-crimson">
                      {planet}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {nativitySummary && (
            <p className="font-mono text-xs text-dust/50 tracking-wide">
              Assessed for {lagna} Lagna
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
