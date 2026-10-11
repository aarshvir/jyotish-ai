// Canonical VedicHour brand + compliance constants — single source of truth for every loop.
// Mirrors the playbook §1.7/§1.10 spec. See memory: vedichour-brand-voice-spec.

export const BRAND = {
  domain: 'https://www.vedichour.com',
  taglineClose: 'Your Life, Decoded Hour by Hour.',
  positioningHook: 'Not another horoscope — a personal Vedic timing grid.',
  // No public promo code. NEWUSER30 was retired 2026-09-13 with the move to subscriptions (the
  // checkout refuses codes on subscription plans). Never put a code, a price or a discount in an ad.
  disclaimer: 'For reflection and planning only. Not medical, legal, financial, or emergency advice.',
  colors: { bg: '0x0a0a1a', mid: '0x0d0d2b', gold: '0xD4AF37' },
  differentiators: [
    'scores 18 hourly windows of your day, each tied to its hora (a day has 24 horas; the product scores the waking day)',
    'real astronomy — computed with the Swiss Ephemeris and Lahiri ayanamsa',
    'explained in plain English',
  ],
  /**
   * AD COPY ONLY. Owner ruling 2026-07-26: "some jargon like Swiss Ephemeris, Lahiri... No one
   * gives a shit. I don't even know what this is." The engine names stay in `differentiators`
   * for the blog and the site, where a reader chose to go deeper; anything that ships inside an
   * ad — script, caption, YouTube description — uses these plain-English versions instead.
   */
  adSafeDifferentiators: [
    'scores 18 hourly windows of your day against your own birth chart',
    'real astronomical data — the same math a careful astrologer uses',
    'explained in plain English, no jargon',
  ],
  pillars: ['Not another horoscope', 'Your day is not one mood', 'Private, modern Jyotish'],
  links: {
    // The free calculators (full results, no sign-up). There is no free report any more.
    freeKundli: '/free-kundli',
    sampleReport: '/sample-report',
    kundali: '/kundali',
    synastry: '/synastry',
    pricing: '/pricing',
    // Nobody buys through /onboard any more: every paid path starts at the quiz.
    onboard: '/start',
    blog: '/blog',
  },
  pronunciation: {
    hora: 'hoh-rah',
    nakshatra: 'nuck-shuh-truh',
    dasha: 'duh-shuh',
    kundli: 'Koond-lee',
    muhurat: 'moo-hoor-tuh',
    jyotish: 'Jyoh-tish',
  },
  suppressMarkets: ['EU', 'Germany'],
} as const;

/** Build a UTM-tagged absolute link. Every public link must go through here. */
export function utm(path: string, source: string, medium: string, campaign = 'launch', content?: string): string {
  const u = new URL(BRAND.domain + path);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', medium);
  u.searchParams.set('utm_campaign', campaign);
  if (content) u.searchParams.set('utm_content', content);
  return u.toString();
}

/** Organic/social landing. Forecast ads show the sample report, never checkout. */
export function landingPath(product: string): string {
  if (product === 'matchmaking') return BRAND.links.synastry;
  if (product === 'kundali') return BRAND.links.kundali;
  if (product === 'forecast') return BRAND.links.sampleReport;
  return BRAND.links.freeKundli;
}

/** Compact brand brief injected into generation prompts so the brain stays on-spec. */
export const BRAND_BRIEF = `BRAND: VedicHour — calm, credible, modern, quietly premium. A thoughtful friend who understands timing. Sell timing AWARENESS and reflection, NEVER certainty, luck, or outcomes.
Voice: specific moments (HR sent 10am and 5pm), not keyword soup. A viewer should feel a Tuesday they recognise.
NEVER use: guaranteed/will definitely/100% · good luck/bad luck/lucky/unlucky · "best hour"/"worst hour" (say "clearer"/"heavier" windows) · fix your life/change your destiny · become rich/get the job/pass the exam/win · save your marriage · cure/heal/treat · avoid disaster/doom/curse · predict exactly. No medical/legal/financial/relationship claims.
NEVER put engine jargon in ads or social. Do not name astronomy libraries, ayanamsa systems, sidereal, whole-sign, or dasha-cycle brand names. Credibility line: "real astronomical data, the same math a careful astrologer uses".
ALWAYS include ≥1 ad-safe differentiator: rates all 18 hours of your day against your own birth chart · real astronomical data · plain English.
Offer: the birth-chart calculators are free with no sign-up; the hour-by-hour forecast is a subscription that starts with a 2-minute quiz. NEVER mention a price, a promo code, a discount, a free report or a free question. Close with the tagline "Your Life, Decoded Hour by Hour."
Links: show the product, never checkout. Forecast → /sample-report. Free start → /free-kundli or /lagna-calculator. Never /pricing in an ad.`;
