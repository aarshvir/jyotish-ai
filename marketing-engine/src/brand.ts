export const BRAND = {
  name: 'VedicHour',
  domain: 'https://www.vedichour.com',
  tagline: 'Your Life, Decoded Hour by Hour.',
  positioning: 'Not another horoscope — a personal Vedic timing grid.',
  disclaimer: 'For reflection and planning only. Not medical, legal, financial, or emergency advice.',
  colors: {
    paper0: '#FBF7F1',
    paper2: '#F4EDE3',
    ink900: '#1E1726',
    ink700: '#3B3247',
    ink500: '#66596F',
    amber600: '#B5862F',
    amber500: '#D4A853',
    night1: '#120C1E',
    star: '#F6EFE4',
  },
  landing: {
    sampleReport: '/sample-report',
    freeStart: '/onboard?plan=free',
  },
  adSafeDifferentiators: [
    'rates all 18 hours of your day against your own birth chart',
    'real astronomical data — the same math a careful astrologer uses',
    'explained in plain English, no jargon',
  ],
} as const;

export function utm(path: string, source: string, medium: string, campaign: string, content?: string): string {
  const u = new URL(/^https?:/i.test(path) ? path : BRAND.domain + path);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', medium);
  u.searchParams.set('utm_campaign', campaign);
  if (content) u.searchParams.set('utm_content', content);
  return u.toString();
}

export const BRAND_BRIEF = `BRAND: VedicHour. Calm, specific, a bit dry. One opinionated person, not a startup.
Sell timing awareness for reflection and planning. NEVER certainty, luck, outcomes, medical/legal/financial promises.
Voice: a Tuesday someone in India actually lived (HR mail at 9:47, papa on the balcony, metro at Andheri). Not "unlock your potential".
Never: guaranteed, 100% accurate, best/worst hour (say clearer/heavier), good luck/bad luck, save your marriage, get the job, become rich, curse, doom.
Ad copy never names Swiss Ephemeris, Lahiri, ayanamsa, sidereal, whole-sign, vimshottari.
Close with the name VedicHour. Put vedichour.com on the card, do not read the URL aloud.
Disclaimer when space allows: ${BRAND.disclaimer}`;
