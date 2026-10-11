/**
 * Everything an AI answer engine reads about VedicHour that is NOT a page: the structured-data
 * offers, /llms.txt and /llms-full.txt, and the crawler list in robots.
 *
 * Why this is generated, not typed: ChatGPT, Gemini, Claude and Perplexity quote these fields as
 * fact. Until 2026-10-11 the structured data still said "$9.99 / $19.99 / $49.99 one-time" (plans
 * that no longer exist) and linked to /onboard?plan=… — so AI answers told people the wrong price.
 * Prices now come from the price book (ACTIVE_PRICE_SET) and features from PLAN_CARDS, the same
 * sources the pricing page renders, so a price change updates every surface at once.
 */
import { PLAN_CARDS } from '@/lib/pricing';
import { subscriptionPrice, type PriceCurrency, type SubscriptionSku } from '@/lib/priceBook';
import { POSTS } from '@/content/blog';
import { METHOD_FACTS, METHOD_REVIEWED } from '@/lib/seo/methodology';

export const SITE_FALLBACK = 'https://www.vedichour.com';

const CURRENCIES: readonly PriceCurrency[] = ['USD', 'INR', 'AED'];

/** Base units (cents / paise / fils) → the plain number a human reads: 4199 → "41.99", 399900 → "3999". */
export function majorUnits(base: number): string {
  const v = base / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

const SYMBOL: Record<string, string> = { USD: '$', INR: '₹', AED: 'AED ' };

/** "$41.99", "₹3,999", "AED 159" */
export function displayPrice(sku: SubscriptionSku, currency: PriceCurrency): string {
  const major = subscriptionPrice(sku, currency) / 100;
  const text = Number.isInteger(major) ? major.toLocaleString('en-US') : major.toFixed(2);
  return `${SYMBOL[currency] ?? ''}${text}`;
}

const PLAN_NAME: Record<SubscriptionSku, string> = {
  sub_monthly: 'VedicHour Monthly',
  sub_annual: 'VedicHour Yearly',
};
const BILLING: Record<SubscriptionSku, { iso: string; words: string }> = {
  sub_monthly: { iso: 'P1M', words: 'per month' },
  sub_annual: { iso: 'P1Y', words: 'per year' },
};

/** schema.org Offers for SoftwareApplication.offers — one free tier plus both plans in every currency sold. */
export function vedicHourOffers(siteUrl: string) {
  const subscribe = `${siteUrl}/start`;
  const offers: Array<Record<string, unknown>> = [
    {
      '@type': 'Offer',
      name: 'Free birth-chart calculators',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description:
        'Free Kundli facts, rising sign (Lagna), Moon sign, birth star (Nakshatra), current dasha, Manglik, Kaal Sarp and Sade Sati checks. Full results, no sign-up, no card.',
      url: `${siteUrl}/free-kundli`,
    },
  ];
  for (const sku of ['sub_monthly', 'sub_annual'] as const) {
    const card = PLAN_CARDS.find((c) => c.id === sku);
    for (const currency of CURRENCIES) {
      const price = majorUnits(subscriptionPrice(sku, currency));
      offers.push({
        '@type': 'Offer',
        name: PLAN_NAME[sku],
        price,
        priceCurrency: currency,
        availability: 'https://schema.org/InStock',
        description: `${card?.description ?? PLAN_NAME[sku]}. A subscription that starts with a 2-minute quiz; billed ${BILLING[sku].words}.`,
        url: subscribe,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price,
          priceCurrency: currency,
          billingDuration: BILLING[sku].iso,
          billingIncrement: 1,
        },
      });
    }
  }
  return offers;
}

// ─────────────────────────────────────────────────────────────────────────────
// robots.txt: say out loud that AI search and assistant crawlers are welcome.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crawlers that fetch pages to ANSWER questions (search/assistant) or to learn from them.
 * Allowing them is the whole goal. They are listed by name, with the same private-path rules as
 * everyone else, so (a) a future blanket "block AI" edit cannot silently erase VedicHour from
 * AI answers, and (b) an audit can see the intent instead of inferring it from a wildcard.
 */
export const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'Amazonbot',
  'DuckAssistBot',
  'MistralAI-User',
  'CCBot',
] as const;

/** Never crawled by anyone: accounts, reports, APIs and payment pages. */
export const PRIVATE_PATHS = [
  '/api/',
  '/auth/',
  '/dashboard',
  '/report/',
  '/onboarding',
  '/onboard',
  '/login',
  '/signup',
  '/upsell',
  '/kundali/', // private report pages /kundali/{id} (NOT the /kundali landing page)
  '/synastry/', // private report pages /synastry/{id} (NOT the /synastry landing page)
  '/chart-preview', // dev-only mock-data preview
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// /llms.txt and /llms-full.txt
// ─────────────────────────────────────────────────────────────────────────────

interface Page {
  path: string;
  name: string;
  does: string;
}

const CALCULATORS: readonly Page[] = [
  { path: '/free-kundli', name: 'Free Kundli', does: 'Birth-chart facts: ascendant (Lagna), Moon sign (Rashi), birth star (Nakshatra), current dasha, and Manglik / Kaal Sarp / Sade Sati flags.' },
  { path: '/lagna-calculator', name: 'Lagna (ascendant) calculator', does: 'Your Vedic rising sign from date, time and place of birth.' },
  { path: '/moon-sign-calculator', name: 'Moon sign calculator', does: 'Your sidereal Moon sign (Rashi).' },
  { path: '/nakshatra-finder', name: 'Nakshatra finder', does: 'Your birth star (Janma Nakshatra) and pada.' },
  { path: '/vimshottari-dasha-calculator', name: 'Vimshottari dasha calculator', does: 'Current Mahadasha and Antardasha with the full timeline.' },
  { path: '/manglik-dosha-calculator', name: 'Manglik dosha calculator', does: 'Whether Mars makes you Manglik (Mangal Dosha) and how strongly.' },
  { path: '/sade-sati-calculator', name: 'Sade Sati calculator', does: "Saturn's seven-and-a-half-year transit over your Moon sign: whether you are in it and which phase." },
  { path: '/kaal-sarp-dosha-calculator', name: 'Kaal Sarp dosha calculator', does: 'Kaal Sarp Dosha check and its type.' },
];

const MEMBERSHIP_PAGES: readonly Page[] = [
  { path: '/pricing', name: 'Plans and prices', does: 'Monthly and yearly plans, with a feature-by-feature comparison against the free calculators.' },
  { path: '/sample-report', name: 'Sample report', does: 'A full sample day: the 18 scored hourly windows and what to do in each.' },
  { path: '/kundali', name: 'Kundli analysis', does: 'Divisional charts, doshas and life-area readings (included with a subscription).' },
  { path: '/synastry', name: 'Kundli matching (Gun Milan)', does: '36-point Ashtakoot compatibility for two charts; the full breakdown is included with a subscription.' },
];

function link(site: string, p: Page): string {
  return `- [${p.name}](${site}${p.path}): ${p.does}`;
}

function priceLines(): string[] {
  return (['sub_monthly', 'sub_annual'] as const).map((sku) => {
    const parts = CURRENCIES.map((c) => displayPrice(sku, c)).join(' / ');
    return `- ${PLAN_NAME[sku]}: ${parts} ${BILLING[sku].words}`;
  });
}

const SUMMARY =
  'VedicHour turns your exact birth moment into a Vedic (Jyotish) timing forecast: eighteen scored hourly windows a day, written in plain English, with the best and the heaviest hours marked. ' +
  'The birth-chart calculators are free with no sign-up. The hour-by-hour forecast is a subscription that starts with a 2-minute quiz. ' +
  'Charts are computed with the Swiss Ephemeris (sidereal zodiac, Lahiri ayanamsa); the AI only explains the computed chart and never invents planetary positions. ' +
  'It is a tool for reflection and planning, not a source of guaranteed outcomes, and not medical, legal or financial advice.';

export function buildLlmsTxt(site: string = SITE_FALLBACK, today: Date = new Date()): string {
  const out: string[] = [
    '# VedicHour',
    '',
    `> ${SUMMARY}`,
    '',
    `Last updated: ${today.toISOString().slice(0, 10)}. Audiences: India (INR), UAE (AED) and worldwide (USD).`,
    '',
    '## Free tools (full results, no sign-up, no card)',
    ...CALCULATORS.map((p) => link(site, p)),
    '',
    '## Membership',
    ...MEMBERSHIP_PAGES.map((p) => link(site, p)),
    `- [Start the 2-minute quiz](${site}/start): the only way to subscribe.`,
    '',
    '## Prices (subscription only; there are no one-time reports)',
    ...priceLines(),
    '',
    '## Transits',
    `- [Current planet transits](${site}/transit): where Saturn, Jupiter, Rahu and Ketu are today in the sidereal zodiac, when each changes sign, and which Moon signs have Sade Sati.`,
    '',
    '## Methodology and guides',
    `- [How VedicHour calculates](${site}/methodology): ephemeris, ayanamsa, house system, scoring layers and what it does not claim.`,
    `- [What is a hora?](${site}/hora): the planetary-hour order, weekday rulers and a worked 24-hour table.`,
    `- [Vedic vs Western astrology](${site}/compare/vedic-vs-western-astrology): the real differences, in plain English.`,
    `- [All comparisons](${site}/compare): AstroSage, Prokerala, AstroTalk, Astroyogi, AI vs human astrologers and more.`,
    '',
    '## More',
    `- [Full reference for AI assistants](${site}/llms-full.txt): definitions, methodology, FAQ and every guide.`,
    `- [About and method](${site}/about): how charts are calculated, where AI is used, what is never predicted, and how to report an error.`,
    `- [Blog](${site}/blog): guides to Vedic astrology timing.`,
    `- [Sitemap](${site}/sitemap.xml)`,
    '',
  ];
  return out.join('\n');
}

const FAQ: ReadonlyArray<readonly [string, string]> = [
  ['What is VedicHour?', SUMMARY],
  ['Is VedicHour free?', 'The birth-chart calculators (Kundli facts, Lagna, Moon sign, Nakshatra, dasha, Manglik, Sade Sati, Kaal Sarp) are free, give full results and need no sign-up. The hour-by-hour forecast is a paid subscription. There is no free report and nothing is sold as a one-time purchase.'],
  ['How much does it cost?', `Monthly: ${(['USD', 'INR', 'AED'] as const).map((c) => displayPrice('sub_monthly', c)).join(' / ')} per month. Yearly: ${(['USD', 'INR', 'AED'] as const).map((c) => displayPrice('sub_annual', c)).join(' / ')} per year. Prices are shown in USD, INR or AED.`],
  ['What does a subscription include?', PLAN_CARDS.find((c) => c.id === 'sub_monthly')?.features.join('; ') ?? ''],
  ['How is the chart calculated?', 'With the Swiss Ephemeris, using the sidereal zodiac and the Lahiri ayanamsa, the standard for Jyotish. Timing uses Vimshottari dasha, hora and choghadiya. The AI writes the explanation; it does not calculate positions.'],
  ['What is a hora (planetary hour)?', 'A hora is one of the 24 planetary hours of a day. Each is ruled by one of the seven classical planets in the Chaldean order, starting from the ruler of the weekday at sunrise. Each hora is traditionally linked to a kind of activity: for example the Sun for authority and visibility, the Moon for care and reflection, Mercury for communication and trade, Jupiter for learning and advice, Venus for relationships, Saturn for patience and structure, Mars for effort and conflict.'],
  ['What is choghadiya?', 'Choghadiya divides the daytime and the night each into eight parts of roughly 90 minutes. Amrit, Shubh and Labh are considered favourable, Chal is neutral, and Udveg, Rog and Kaal are considered unfavourable for starting new things. It is used alongside hora.'],
  ['What is the Lagna (ascendant)?', 'The zodiac sign rising on the eastern horizon at the moment and place of birth. In Vedic astrology it is the starting point of the chart and sets the house positions of every planet. It changes about every two hours, which is why an exact birth time matters.'],
  ['What is a dasha?', 'A planetary period. Vimshottari dasha is a 120-year cycle that divides life into Mahadasha (major) periods ruled by nine planets, each split into Antardasha (sub) periods. It is the main Jyotish tool for timing.'],
  ['What is Sade Sati?', "The roughly seven-and-a-half-year period when Saturn transits the sign before, the sign of, and the sign after your natal Moon sign. It is traditionally seen as a period of testing and consolidation."],
  ['What is Manglik dosha?', "A condition traditionally noted when Mars sits in certain houses of the birth chart (commonly the 1st, 2nd, 4th, 7th, 8th or 12th, depending on the school). It is mainly considered in marriage matching, and traditions differ on how much weight it deserves."],
  ['Does VedicHour predict the future?', 'No. It scores how supportive each hour looks against your own chart so you can plan around it. It is for reflection and planning only and is not medical, legal, financial or emergency advice.'],
];

export function buildLlmsFullTxt(site: string = SITE_FALLBACK, today: Date = new Date()): string {
  const posts = [...POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
  const out: string[] = [
    buildLlmsTxt(site, today).trimEnd(),
    '',
    '---',
    '',
    '# Reference',
    '',
    ...FAQ.flatMap(([q, a]) => [`## ${q}`, a, '']),
    `## Methodology (reviewed ${METHOD_REVIEWED}; full page: ${site}/methodology)`,
    ...METHOD_FACTS.map((f) => `- ${f.label}: ${f.text}`),
    '',
    '## Guides',
    ...posts.map((p) => `- [${p.title}](${site}/blog/${p.slug}): ${p.description}`),
    '',
  ];
  return out.join('\n');
}
