// Canonical VedicHour brand + compliance constants — single source of truth for every loop.
// Mirrors the playbook §1.7/§1.10 spec. See memory: vedichour-brand-voice-spec.

export const BRAND = {
  domain: 'https://www.vedichour.com',
  taglineClose: 'Your Life, Decoded Hour by Hour.',
  positioningHook: 'Not another horoscope — a personal Vedic timing grid.',
  promoPublic: 'NEWUSER30', // 30% off first paid report — the ONLY public code
  disclaimer: 'For reflection and planning only. Not medical, legal, financial, or emergency advice.',
  colors: { bg: '0x0a0a1a', mid: '0x0d0d2b', gold: '0xD4AF37' },
  differentiators: [
    'rates all 18 planetary hours (horas) of your day',
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
    'rates all 18 hours of your day against your own birth chart',
    'real astronomical data — the same math a careful astrologer uses',
    'explained in plain English, no jargon',
  ],
  pillars: ['Not another horoscope', 'Your day is not one mood', 'Private, modern Jyotish'],
  links: {
    freeKundli: '/free-kundli',
    kundali: '/kundali',
    synastry: '/synastry',
    pricing: '/pricing',
    onboard: '/onboard',
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

/** Compact brand brief injected into generation prompts so the brain stays on-spec. */
export const BRAND_BRIEF = `BRAND: VedicHour — calm, credible, modern, quietly premium. A thoughtful friend who understands astronomy and Jyotish. Sell timing AWARENESS and reflection, NEVER certainty, luck, or outcomes.
NEVER use: guaranteed/will definitely/100% · good luck/bad luck/lucky/unlucky · "best hour"/"worst hour" (say "clearer"/"heavier" windows) · fix your life/change your destiny · become rich/get the job/pass the exam/win · save your marriage · cure/heal/treat · avoid disaster/doom/curse · predict exactly. No medical/legal/financial/relationship claims.
ALWAYS include ≥1 differentiator: rates all 18 planetary hours (horas) · Swiss Ephemeris + Lahiri ayanamsa · plain English.
Promo: NEWUSER30 (30% off first paid report) — only public code. Close with the tagline "Your Life, Decoded Hour by Hour." Internal links only: /free-kundli /kundali /synastry /pricing /blog.`;
