'use client';

import { motion } from 'framer-motion';

interface NativitySummary {
  lagna_analysis?: string;
  current_dasha_interpretation?: string;
  key_yogas?: string[];
  functional_benefics?: string[];
  functional_malefics?: string[];
}

interface PlanetaryPosition {
  planet: string;
  sign: string;
  house: number;
  nakshatra: string;
  dignity?: string;
  significance?: string;
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
  nativity?: {
    planetary_positions?: PlanetaryPosition[];
    life_themes?: string[];
    current_year_theme?: string;
  };
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

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
  nativity,
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
          {(nativitySummary?.key_yogas?.length ?? 0) > 0 && (
            <div>
              <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3">
                Key Yogas
              </p>
              <div className="flex flex-wrap gap-2">
                {(nativitySummary?.key_yogas ?? []).map((yoga, i) => (
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

          {(nativitySummary?.functional_benefics?.length ?? 0) > 0 && (
            <div>
              <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3">
                Functional Benefics
              </p>
              <div className="flex flex-wrap gap-2">
                {(nativitySummary?.functional_benefics ?? []).map((planet, i) => (
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

          {(nativitySummary?.functional_malefics?.length ?? 0) > 0 && (
            <div>
              <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3">
                Functional Malefics
              </p>
              <div className="flex flex-wrap gap-2">
                {(nativitySummary?.functional_malefics ?? []).map((planet, i) => (
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

          {(nativity?.life_themes?.length ?? 0) > 0 && (
            <div>
              <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3">
                Life Themes
              </p>
              <div className="flex flex-wrap gap-2">
                {(nativity?.life_themes ?? []).map((theme, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-amber/10 border border-amber/20"
                  >
                    <span className="font-display text-xs text-amber/90 italic">
                      {theme}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {nativity?.current_year_theme && (
            <div className="py-3 px-4 rounded-sm bg-amber/5 border border-amber/20">
              <p className="font-mono text-xs text-amber tracking-[0.15em] uppercase mb-2">
                2026 Theme
              </p>
              <p className="font-display text-star text-sm leading-[1.7]">
                {nativity.current_year_theme}
              </p>
            </div>
          )}

          {(nativitySummary || nativity) && (
            <p className="font-mono text-xs text-dust/50 tracking-wide">
              Assessed for {lagna} Lagna
            </p>
          )}
        </div>
      </div>

      {(nativity?.planetary_positions?.length ?? 0) > 0 && (
        <div className="mt-8 pt-8 border-t border-horizon/40">
          <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-4">
            Planetary Positions
          </p>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-dust border-b border-horizon">
                  <th className="text-left py-2 pr-4">Planet</th>
                  <th className="text-left py-2 pr-4">Sign</th>
                  <th className="text-left py-2 pr-4">House</th>
                  <th className="text-left py-2 pr-4">Nakshatra</th>
                  <th className="text-left py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {(nativity?.planetary_positions ?? []).map((p, i) => (
                  <tr key={i} className="border-b border-horizon/40">
                    <td className="py-2 pr-4 text-amber">
                      {PLANET_SYMBOLS[p.planet] ?? ''} {p.planet}
                    </td>
                    <td className="py-2 pr-4 text-star">{p.sign}</td>
                    <td className="py-2 pr-4 text-dust">H{p.house}</td>
                    <td className="py-2 pr-4 text-dust">{p.nakshatra}</td>
                    <td className="py-2 text-star/80">{p.significance ?? p.dignity ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
