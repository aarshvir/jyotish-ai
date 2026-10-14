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
import { isCommercialCheckoutEnabled, COMMERCIAL_UNAVAILABLE_MESSAGE } from '@/lib/commercial/availability';

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
export function vedicHourOffers(siteUrl: string, checkoutEnabled = isCommercialCheckoutEnabled()) {
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
  if (!checkoutEnabled) return offers;
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
  '/admin',
  '/admin2',
  '/resume',
  '/q/',
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
  { path: '/pricing', name: 'Availability and pricing', does: 'What is free now and whether new paid readings are available.' },
  { path: '/sample-report', name: 'Example reading', does: 'A 30-day example for a fictional reader, including traditional hourly scores and generated interpretation.' },
  { path: '/kundali', name: 'Kundli analysis', does: 'Free chart facts and access to existing entitled readings.' },
  { path: '/synastry', name: 'Kundli matching (Gun Milan)', does: 'A free traditional 36-point compatibility score for two charts; existing entitled accounts can access their full reading.' },
  { path: '/help', name: 'Help', does: 'Birth-time uncertainty, choosing a city, understanding results, retrieving reports and controlling saved details.' },
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

function summary(checkoutEnabled: boolean) {
  return 'VedicHour provides free Vedic (Jyotish) birth-chart facts and a traditional compatibility score with no sign-up or card. ' +
    'Enter a birth date, a known birth time and a confirmed birth city. Chart positions use Swiss Ephemeris, the sidereal zodiac and Lahiri ayanamsa. ' +
    'Astrological meanings and hourly ratings are traditional interpretations, not probabilities of an outcome. Written readings may use AI and can contain errors. ' +
    (checkoutEnabled ? 'New written readings are available through the plans on /pricing. ' : `${COMMERCIAL_UNAVAILABLE_MESSAGE} `) +
    'Use the product for reflection, not medical, legal or financial decisions.';
}

export function buildLlmsTxt(site: string = SITE_FALLBACK, today: Date = new Date(), checkoutEnabled = isCommercialCheckoutEnabled()): string {
  const out: string[] = [
    '# VedicHour',
    '',
    `> ${summary(checkoutEnabled)}`,
    '',
    `Last updated: ${today.toISOString().slice(0, 10)}. Audiences: India (INR), UAE (AED) and worldwide (USD).`,
    '',
    '## Free tools (full results, no sign-up, no card)',
    ...CALCULATORS.map((p) => link(site, p)),
    '',
    '## Readings and help',
    ...MEMBERSHIP_PAGES.map((p) => link(site, p)),
    `- [Start](${site}/start): ${checkoutEnabled ? 'a quiz leading to the current subscription offer.' : 'free calculator, example and existing account access.'}`,
    '',
    '## Availability and cost',
    ...(checkoutEnabled ? priceLines() : ['- Free calculators: no charge, account or card.', '- New paid readings: currently unavailable. No purchase or trial can be started.', '- Existing account reports remain accessible.']),
    '',
    '## Transits',
    `- [Current planet transits](${site}/transit): where Saturn, Jupiter, Rahu and Ketu are today in the sidereal zodiac, when each changes sign, and which Moon signs have Sade Sati.`,
    '',
    '## Methodology and guides',
    `- [How VedicHour calculates](${site}/methodology): ephemeris, ayanamsa, house system, scoring layers and what it does not claim.`,
    `- [About and editorial policy](${site}/about): sources, where AI is used, what is never predicted, how to report a mistake.`,
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
  ['How is the chart calculated?', 'With the Swiss Ephemeris, using the sidereal zodiac and the Lahiri ayanamsa, the standard for Jyotish. Timing uses Vimshottari dasha, hora and choghadiya. The AI writes the explanation; it does not calculate positions.'],
  ['What is a hora (planetary hour)?', 'A hora is one of the 24 planetary hours of a day. Each is ruled by one of the seven classical planets in the Chaldean order, starting from the ruler of the weekday at sunrise. Each hora is traditionally linked to a kind of activity: for example the Sun for authority and visibility, the Moon for care and reflection, Mercury for communication and trade, Jupiter for learning and advice, Venus for relationships, Saturn for patience and structure, Mars for effort and conflict.'],
  ['What is choghadiya?', 'Choghadiya divides the daytime and the night each into eight parts of roughly 90 minutes. Amrit, Shubh and Labh are considered favourable, Chal is neutral, and Udveg, Rog and Kaal are considered unfavourable for starting new things. It is used alongside hora.'],
  ['What is the Lagna (ascendant)?', 'The zodiac sign rising on the eastern horizon at the moment and place of birth. In Vedic astrology it is the starting point of the chart and sets the house positions of every planet. It changes about every two hours, which is why an exact birth time matters.'],
  ['What is a dasha?', 'A planetary period. Vimshottari dasha is a 120-year cycle that divides life into Mahadasha (major) periods ruled by nine planets, each split into Antardasha (sub) periods. It is the main Jyotish tool for timing.'],
  ['What is Sade Sati?', "The roughly seven-and-a-half-year period when Saturn transits the sign before, the sign of, and the sign after your natal Moon sign. It is traditionally seen as a period of testing and consolidation."],
  ['What is Manglik dosha?', "A condition traditionally noted when Mars sits in certain houses of the birth chart (commonly the 1st, 2nd, 4th, 7th, 8th or 12th, depending on the school). It is mainly considered in marriage matching, and traditions differ on how much weight it deserves."],
  ['Does VedicHour predict the future?', 'No. It scores how supportive each hour looks against your own chart so you can plan around it. It is for reflection and planning only and is not medical, legal, financial or emergency advice.'],
];

export function buildLlmsFullTxt(site: string = SITE_FALLBACK, today: Date = new Date(), checkoutEnabled = isCommercialCheckoutEnabled()): string {
  const posts = [...POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
  const out: string[] = [
    buildLlmsTxt(site, today, checkoutEnabled).trimEnd(),
    '',
    '---',
    '',
    '# Reference',
    '',
    '## What is VedicHour?', summary(checkoutEnabled), '',
    '## Is VedicHour free?', 'The chart calculators and traditional compatibility score are free. A personal hourly forecast is not included in the free chart calculation.', '',
    '## How much does it cost?', ...(checkoutEnabled ? priceLines() : [COMMERCIAL_UNAVAILABLE_MESSAGE]), '',
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
