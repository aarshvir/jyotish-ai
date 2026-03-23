'use client';

import { motion } from 'framer-motion';

interface NativitySummary {
  lagna_analysis?: string;
  current_dasha_interpretation?: string;
  key_yogas?: Array<string | Record<string, unknown>>;
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

const LAGNA_FALLBACK = (lagna: string, moonSign: string, dasha: string) =>
  `${lagna} lagna native with Moon in ${moonSign}. Current dasha period ${dasha} shapes the dominant themes. The lagna lord governs identity and vitality; functional benefics and malefics for this lagna influence daily outcomes.`;

const DASHA_FALLBACK = (dasha: string) =>
  `Current ${dasha} dasha period shapes dominant themes. Use hora and choghadiya to align important activities with favourable planetary hours.`;

function safeText(text: string | undefined, fallback: string): string {
  const t = (text ?? '').trim();
  if (!t || /temporarily unavailable/i.test(t)) return fallback;
  return t;
}

function renderYogaValue(yoga: string | Record<string, unknown>): string {
  if (typeof yoga === 'string') return yoga;
  return String(
    yoga.name ??
    yoga.yoga_name ??
    yoga.description ??
    JSON.stringify(yoga)
  );
}

export function NativityCard({
  name: nameProp,
  birthDate: birthDateProp,
  birthTime: birthTimeProp,
  birthCity: birthCityProp,
  lagna: lagnaProp,
  lagnaDegree: lagnaDegreeProp,
  moonSign: moonSignProp,
  moonNakshatra: moonNakshatraProp,
  currentDasha: currentDashaProp,
  nativitySummary,
  nativity,
}: NativityCardProps) {
  const name = nameProp ?? 'Seeker';
  const birthDate = birthDateProp ?? '';
  const birthTime = birthTimeProp ?? '';
  const birthCity = birthCityProp ?? '';
  const lagna = lagnaProp ?? 'Cancer';
  const lagnaDegree = typeof lagnaDegreeProp === 'number' && !Number.isNaN(lagnaDegreeProp) ? lagnaDegreeProp : 0;
  const moonSign = moonSignProp ?? 'Cancer';
  const moonNakshatra = moonNakshatraProp ?? '';
  const currentDasha = currentDashaProp ?? { mahadasha: 'Unknown', antardasha: 'Unknown' };
  // Debug trace to ensure nativity never silently crashes
  try {
    // eslint-disable-next-line no-console
    console.log(
      '[NATIVITY-CARD] data:',
      JSON.stringify(
        {
          lagna,
          moonSign,
          currentDasha,
          hasSummary: !!nativitySummary,
          hasNativity: !!nativity,
        }
      )?.slice(0, 200)
    );
  } catch {
    // ignore logging failures
  }

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
            {name.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
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

          <div className="pt-6 border-t border-horizon/40 mb-6">
            <p className="font-display text-star text-base leading-[1.8]">
              {safeText(
                nativitySummary?.lagna_analysis,
                LAGNA_FALLBACK(lagna, moonSign, `${currentDasha.mahadasha}/${currentDasha.antardasha}`)
              )}
            </p>
          </div>

          <div className="pt-6 border-t border-horizon/40">
            <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3">
              Current Dasha Period
            </p>
            <p className="font-display text-star text-sm leading-[1.8]">
              {safeText(
                nativitySummary?.current_dasha_interpretation,
                DASHA_FALLBACK(`${currentDasha.mahadasha}/${currentDasha.antardasha}`)
              )}
            </p>
          </div>
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
                    title={renderYogaValue(yoga)}
                  >
                    <span className="font-mono text-xs text-amber">
                      {renderYogaValue(yoga).split('(')[0].trim()}
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

          <p className="font-mono text-xs text-dust/50 tracking-wide">
            Assessed for {lagna} Lagna
          </p>
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
