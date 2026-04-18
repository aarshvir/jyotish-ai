/**
 * Pillar 2: Yoga Detector
 *
 * Statically detects which classical Jyotish yogas are likely present in a
 * NatalChartData object so the NativityAgent can pass them to the RAG retriever.
 *
 * Design goals:
 *  - Zero async, zero network — runs in <1ms so it never blocks the pipeline.
 *  - Best-effort: if the chart data is incomplete it returns fewer yogas (safe degradation).
 *  - Returns canonical yoga names that match SCRIPTURE_CORPUS keyword / topic fields.
 */

import type { NatalChartData } from '@/lib/agents/types';

const KENDRA_HOUSES = new Set([1, 4, 7, 10]);
const DUSTHANA_HOUSES = new Set([6, 8, 12]);

// Exaltation signs per planet
const EXALT: Record<string, string> = {
  Sun: 'Aries',
  Moon: 'Taurus',
  Mars: 'Capricorn',
  Mercury: 'Virgo',
  Jupiter: 'Cancer',
  Venus: 'Pisces',
  Saturn: 'Libra',
};

// Debilitation signs per planet
const DEBIL: Record<string, string> = {
  Sun: 'Libra',
  Moon: 'Scorpio',
  Mars: 'Cancer',
  Mercury: 'Pisces',
  Jupiter: 'Capricorn',
  Venus: 'Virgo',
  Saturn: 'Aries',
};

// Own signs per planet
const OWN: Record<string, string[]> = {
  Sun: ['Leo'],
  Moon: ['Cancer'],
  Mars: ['Aries', 'Scorpio'],
  Mercury: ['Gemini', 'Virgo'],
  Jupiter: ['Sagittarius', 'Pisces'],
  Venus: ['Taurus', 'Libra'],
  Saturn: ['Capricorn', 'Aquarius'],
};

// Mahapurusha yoga planets and their own+exalt signs
const MAHAPURUSHA_PLANETS = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;
const MAHAPURUSHA_YOGA_NAME: Record<string, string> = {
  Mars: 'Ruchaka Yoga',
  Mercury: 'Bhadra Yoga',
  Jupiter: 'Hamsa Yoga',
  Venus: 'Malavya Yoga',
  Saturn: 'Shasha Yoga',
};

type Planet = { sign?: string; house?: number; degree?: number; is_retrograde?: boolean };
type Planets = Record<string, Planet>;

function house(planets: Planets, name: string): number | undefined {
  return planets[name]?.house;
}

function sign(planets: Planets, name: string): string | undefined {
  return planets[name]?.sign;
}

function degree(planets: Planets, name: string): number {
  return planets[name]?.degree ?? 0;
}

function isInKendra(planets: Planets, name: string): boolean {
  const h = house(planets, name);
  return h !== undefined && KENDRA_HOUSES.has(h);
}


function isExalted(planets: Planets, name: string): boolean {
  return sign(planets, name) === EXALT[name];
}

function isDebilitated(planets: Planets, name: string): boolean {
  return sign(planets, name) === DEBIL[name];
}

function isOwnSign(planets: Planets, name: string): boolean {
  const s = sign(planets, name);
  return !!s && (OWN[name] ?? []).includes(s);
}

function isInDusthana(planets: Planets, name: string): boolean {
  const h = house(planets, name);
  return h !== undefined && DUSTHANA_HOUSES.has(h);
}

/**
 * Detect yogas present in a chart and return their canonical names.
 * Returns an empty array if the chart has insufficient data.
 *
 * Limit to 6 yogas max to keep the RAG context block short and relevant.
 */
export function detectYogas(chart: NatalChartData): string[] {
  const yogas = new Set<string>();
  const planets = (chart.planets ?? {}) as Planets;

  // ── Gajakesari Yoga ───────────────────────────────────────────────────────
  // Jupiter in Kendra from Moon
  {
    const moonH = house(planets, 'Moon');
    const jupH = house(planets, 'Jupiter');
    if (moonH !== undefined && jupH !== undefined) {
      const diff = ((jupH - moonH + 12) % 12) + 1;
      if ([1, 4, 7, 10].includes(diff)) {
        yogas.add('Gajakesari Yoga');
      }
    }
  }

  // ── Budhaditya Yoga ───────────────────────────────────────────────────────
  // Mercury + Sun in same house, Mercury not combust (>14° from Sun)
  {
    const sunH = house(planets, 'Sun');
    const mercH = house(planets, 'Mercury');
    if (sunH !== undefined && mercH === sunH) {
      const mercDeg = degree(planets, 'Mercury');
      const sunDeg = degree(planets, 'Sun');
      const separation = Math.abs(mercDeg - sunDeg);
      if (separation > 14) {
        yogas.add('Budhaditya Yoga');
      }
    }
  }

  // ── Pancha Mahapurusha Yogas ──────────────────────────────────────────────
  for (const planet of MAHAPURUSHA_PLANETS) {
    if (isInKendra(planets, planet) && (isExalted(planets, planet) || isOwnSign(planets, planet))) {
      yogas.add(MAHAPURUSHA_YOGA_NAME[planet]);
    }
  }

  // ── Chandra-Mangal Yoga ───────────────────────────────────────────────────
  {
    const moonH = house(planets, 'Moon');
    const marsH = house(planets, 'Mars');
    if (moonH !== undefined && marsH !== undefined && moonH === marsH) {
      yogas.add('Chandra-Mangal Yoga');
    }
  }

  // ── Dhana Yoga ────────────────────────────────────────────────────────────
  // 2nd or 11th lord in Kendra/Trikona — approximate via house positions
  // (Full lord detection needs sign→lord mapping; we use a best-effort heuristic)
  // Jupiter in 2nd, 5th, 9th, 11th = Dhana Yoga proxy
  {
    const jupH = house(planets, 'Jupiter');
    if (jupH !== undefined && [2, 5, 9, 11].includes(jupH)) {
      yogas.add('Dhana Yoga');
    }
  }

  // ── Viparita Raja Yoga ────────────────────────────────────────────────────
  // Dusthana lords in other dusthanas — proxy: if two or more of 6th, 8th, 12th house rulers
  // are in dusthanas themselves. Since we lack house lord lookup here,
  // detect if Saturn (natural 8th+ signifier) and Mars are both in dusthanas.
  {
    if (isInDusthana(planets, 'Saturn') && isInDusthana(planets, 'Mars')) {
      yogas.add('Viparita Raja Yoga');
    }
  }

  // ── Raja Yoga (Kendra-Trikona lord association) ───────────────────────────
  // Approximate: planet in Kendra that is also a natural trikona ruler
  // Full computation needs lagna — use Jupiter (natural trikona signifier) in Kendra
  {
    if (isInKendra(planets, 'Jupiter') && !isInDusthana(planets, 'Jupiter')) {
      yogas.add('Raja Yoga');
    }
  }

  // ── Neecha Bhanga ─────────────────────────────────────────────────────────
  // Any debilitated planet + its debilitation lord in a Kendra
  {
    for (const p of Object.keys(DEBIL)) {
      if (isDebilitated(planets, p)) {
        // Check if the debilitation sign lord is in a Kendra (approximate)
        // We know exaltation lord placement as a proxy
        const exaltLordMap: Record<string, string> = {
          Sun: 'Venus', Moon: 'Mars', Mars: 'Saturn', Mercury: 'Jupiter',
          Jupiter: 'Mars', Venus: 'Mercury', Saturn: 'Venus',
        };
        const lord = exaltLordMap[p];
        if (lord && isInKendra(planets, lord)) {
          yogas.add('Neecha Bhanga Raja Yoga');
          break;
        }
      }
    }
  }

  // ── Vimshottari Dasha ─────────────────────────────────────────────────────
  // Always include dasha context — foundational for all commentary
  yogas.add('Vimshottari Dasha System');

  return Array.from(yogas).slice(0, 8); // cap at 8 to keep RAG context tight
}

/**
 * Build a transit query string for RAG based on which planets are transiting
 * important points relative to the natal chart.
 * Used by the orchestrator to pull relevant transit texts.
 */
export function buildTransitQueryTerms(
  chart: NatalChartData,
  mahadasha: string,
  antardasha: string,
): string[] {
  const terms: string[] = [];
  const moonSign = (chart.planets as Planets)?.Moon?.sign;

  // Dasha-based terms
  if (mahadasha === 'Saturn' || antardasha === 'Saturn') {
    terms.push('Saturn Transit (Sade Sati)');
  }
  if (mahadasha === 'Jupiter' || antardasha === 'Jupiter') {
    terms.push('Jupiter Transit');
  }
  if (mahadasha === 'Rahu' || antardasha === 'Rahu' || mahadasha === 'Ketu' || antardasha === 'Ketu') {
    terms.push('Rahu and Ketu');
  }

  // Moon transit always relevant
  if (moonSign) {
    terms.push(`Moon Transit Through Nakshatras`);
  }

  // Hora and timing always relevant for hourly forecasts
  terms.push('Hora System');
  terms.push('Choghadiya System');
  terms.push('Rahu Kaal and Inauspicious Timing');

  return Array.from(new Set(terms));
}
