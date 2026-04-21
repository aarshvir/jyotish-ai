/**
 * Deterministic daily horoscope blurbs for programmatic SEO.
 * Content varies by sign + date without per-URL LLM spend.
 *
 * Product note: Pillar 4 originally sketched optional cached LLM per URL; we keep
 * deterministic copy for predictable cost, latency, and compliance — ISR still
 * refreshes pages on `revalidate`.
 */

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;

export type HoroscopeSign = (typeof SIGNS)[number];

export function isValidHoroscopeSign(s: string): s is HoroscopeSign {
  return (SIGNS as readonly string[]).includes(s);
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function buildHoroscopeCopy(sign: HoroscopeSign, isoDate: string): {
  title: string;
  metaDescription: string;
  body: string[];
} {
  const title = `${capitalize(sign)} daily horoscope · ${isoDate}`;
  const seed = hashString(`${sign}:${isoDate}`);
  const moonPhase = ['waning discipline', 'waxing opportunity', 'stable review', 'volatile emotions'][seed % 4];
  const focus = ['career visibility', 'relationship tone', 'money rhythm', 'health habits', 'spiritual practice'][seed % 5];
  const body = [
    `For ${capitalize(sign)} ascending themes on ${isoDate}, emphasis lands on ${focus}. The day favours structured planning rather than impulsive moves — align important tasks with benefic hora windows after checking your full VedicHour forecast.`,
    `Lunar mood today trends toward ${moonPhase}; pair that with sign-specific strengths: honour ${sign}’s natural pacing and avoid overcommitting in the first half of the day.`,
    `This page is algorithmically generated for discovery — for personalised hourly timing, charts, and dasha-aware guidance, run a VedicHour forecast.`,
  ];
  const metaDescription = body[0].slice(0, 155);
  return { title, metaDescription, body };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const HOROSCOPE_SIGNS = SIGNS;
