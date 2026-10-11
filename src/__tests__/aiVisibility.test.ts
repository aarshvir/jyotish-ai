import { describe, it, expect } from 'vitest';
import robots from '@/app/robots';
import {
  AI_CRAWLERS,
  PRIVATE_PATHS,
  buildLlmsFullTxt,
  buildLlmsTxt,
  displayPrice,
  majorUnits,
  vedicHourOffers,
} from '@/lib/seo/aiVisibility';
import { subscriptionPrice } from '@/lib/priceBook';

const SITE = 'https://www.vedichour.com';
const TODAY = new Date('2026-10-11T00:00:00Z');

/** Prices and promises that stopped existing on 2026-09-13. AI engines quote these as fact. */
const RETIRED = [/\$9\.99/, /\$19\.99/, /\$49\.99/, /₹\s?799\b/, /₹\s?1,?499\b/, /pay once/i, /no subscription/i, /NEWUSER30/, /money-back/i];

/** Phrases that are fine ONLY when the sentence denies them ("there is no free report"). */
const ONLY_IF_DENIED = [/one-time (payment|report|purchase)/i, /free report/i];
function promisedWithoutDenial(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n/)
    .filter((sentence) => ONLY_IF_DENIED.some((re) => re.test(sentence)) && !/\b(no|nothing|not|never|without)\b/i.test(sentence));
}

describe('prices an AI answer would quote', () => {
  it('formats the price book, not a typed number', () => {
    expect(majorUnits(4199)).toBe('41.99');
    expect(majorUnits(399900)).toBe('3999');
    expect(displayPrice('sub_monthly', 'USD')).toBe(`$${(subscriptionPrice('sub_monthly', 'USD') / 100).toFixed(2)}`);
    expect(displayPrice('sub_monthly', 'INR')).toMatch(/^₹[\d,]+$/);
    expect(displayPrice('sub_annual', 'AED')).toMatch(/^AED [\d,]+$/);
  });

  it('structured data offers match the price book in every currency and link to the quiz, never /onboard', () => {
    const offers = vedicHourOffers(SITE);
    for (const sku of ['sub_monthly', 'sub_annual'] as const) {
      for (const currency of ['USD', 'INR', 'AED'] as const) {
        const o = offers.find((x) => x.priceCurrency === currency && String(x.name).toLowerCase().includes(sku === 'sub_monthly' ? 'monthly' : 'yearly'));
        expect(o, `${sku} ${currency}`).toBeTruthy();
        expect(o!.price).toBe(majorUnits(subscriptionPrice(sku, currency)));
        expect((o!.priceSpecification as { billingDuration: string }).billingDuration).toBe(sku === 'sub_monthly' ? 'P1M' : 'P1Y');
        expect(o!.url).toBe(`${SITE}/start`);
      }
    }
    const free = offers.find((o) => o.price === '0')!;
    expect(free.url).toBe(`${SITE}/free-kundli`);
    expect(JSON.stringify(offers)).not.toMatch(/\/onboard/);
    for (const re of RETIRED) expect(JSON.stringify(offers)).not.toMatch(re);
    expect(promisedWithoutDenial(JSON.stringify(offers))).toEqual([]);
  });

  it('llms.txt and llms-full.txt state the live prices and none of the retired promises', () => {
    for (const text of [buildLlmsTxt(SITE, TODAY), buildLlmsFullTxt(SITE, TODAY)]) {
      for (const sku of ['sub_monthly', 'sub_annual'] as const) {
        for (const c of ['USD', 'INR', 'AED'] as const) expect(text).toContain(displayPrice(sku, c));
      }
      for (const re of RETIRED) expect(text, String(re)).not.toMatch(re);
      expect(promisedWithoutDenial(text)).toEqual([]);
      expect(text).toContain(`${SITE}/start`);
      expect(text).toContain('no sign-up');
    }
  });

  it('llms.txt links are absolute, on the site, and the last-updated date is the one passed in', () => {
    const text = buildLlmsTxt(SITE, TODAY);
    const urls: string[] = [];
    const linkRe = /\]\((https?:[^)]+)\)/g;
    for (let m = linkRe.exec(text); m; m = linkRe.exec(text)) urls.push(m[1]);
    expect(urls.length).toBeGreaterThan(12);
    for (const u of urls) expect(u.startsWith(SITE)).toBe(true);
    expect(text).toContain('Last updated: 2026-10-11');
  });

  it('llms-full.txt carries the definitions assistants are asked about and lists the guides', () => {
    const text = buildLlmsFullTxt(SITE, TODAY);
    for (const q of ['What is a hora', 'What is choghadiya', 'What is the Lagna', 'What is a dasha', 'What is Sade Sati', 'What is Manglik dosha']) {
      expect(text).toContain(`## ${q}`);
    }
    expect(text).toContain('## Guides');
    expect(text.match(/\(https:\/\/www\.vedichour\.com\/blog\//g)!.length).toBeGreaterThan(20);
  });
});

describe('robots: AI search crawlers are welcome, private pages are not', () => {
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules];

  it('names every AI crawler with the same allow and private-path rules as everyone', () => {
    const ai = rules.find((x) => Array.isArray(x.userAgent) && x.userAgent.includes('GPTBot'))!;
    expect(ai).toBeTruthy();
    for (const bot of AI_CRAWLERS) expect(ai.userAgent).toContain(bot);
    for (const bot of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended']) {
      expect(AI_CRAWLERS).toContain(bot);
    }
    expect(ai.allow).toContain('/');
    expect(ai.disallow).toEqual([...PRIVATE_PATHS]);
  });

  it('never blocks the public pages AI should cite, and always blocks the private ones', () => {
    for (const rule of rules) {
      const dis = [rule.disallow].flat().filter(Boolean) as string[];
      for (const pub of ['/', '/free-kundli', '/blog', '/lagna-calculator', '/compare', '/llms.txt', '/llms-full.txt', '/pricing', '/sample-report']) {
        expect(dis.some((d) => d === '/' || pub.startsWith(d)), `${pub} blocked by ${dis.join(',')}`).toBe(false);
      }
      for (const priv of ['/api/', '/report/', '/dashboard', '/auth/']) expect(dis).toContain(priv);
    }
  });
});
