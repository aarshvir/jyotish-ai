import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FAQS } from '../lib/faq-data';
import { INDIA_MONTHLY, INDIA_YEARLY, INDIA_PRICES, SUBSCRIPTION_LINE } from '../lib/landingCopy';
import { subscriptionPrice } from '../lib/priceBook';
import { formatAmount } from '../lib/ziina/amounts';

/**
 * The homepage and its FAQ (which also feeds FAQPage JSON-LD) must describe the plan that is
 * actually sold: free calculators plus one monthly or yearly subscription. They once still
 * advertised "7 or 30 days" and a "7-day" tier that no longer exists.
 */
const ROOT = process.cwd();
const FILES = [
  'src/components/landing/FinalCTA.tsx',
  'src/components/landing/FreeKundli.tsx',
  'src/components/landing/Products.tsx',
  'src/lib/faq-data.ts',
];

// Wording of the retired one-time plans and the retired "Free Kundli plan".
const STALE = /7 or 30 days|7- or 30-day|7 days or 30 days|7-day|Free Kundli plan|upgrade to a paid plan/i;

describe('landing copy', () => {
  it('takes the India prices from the price book', () => {
    expect(INDIA_MONTHLY).toBe(formatAmount(subscriptionPrice('sub_monthly', 'INR'), 'INR'));
    expect(INDIA_YEARLY).toBe(formatAmount(subscriptionPrice('sub_annual', 'INR'), 'INR'));
    expect(INDIA_PRICES).toBe(`${INDIA_MONTHLY} or ${INDIA_YEARLY} in India`);
    expect(SUBSCRIPTION_LINE).toContain('one monthly or yearly subscription');
  });

  it('does not hard-code a rupee price in the landing sources', () => {
    for (const f of FILES) {
      const src = readFileSync(join(ROOT, f), 'utf8');
      expect(src, `${f} hard-codes a rupee amount`).not.toMatch(/₹\s?\d/);
    }
  });

  it('does not mention retired plans', () => {
    for (const f of FILES) {
      const src = readFileSync(join(ROOT, f), 'utf8');
      expect(src, `${f} still mentions a retired plan`).not.toMatch(STALE);
    }
  });

  it('distinguishes free chart facts from personal forecasts and written readings', () => {
    const a = FAQS.find((x) => /free Kundli/i.test(x.q))?.a ?? '';
    expect(a).toContain('free calculators');
    expect(a).toMatch(/hourly forecasts and written readings are not part of the free chart/i);
    expect(a).not.toContain(SUBSCRIPTION_LINE);
  });
});
