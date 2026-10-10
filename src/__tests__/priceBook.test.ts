import { describe, it, expect } from 'vitest';
import {
  charmDown,
  isCharmPrice,
  localizeFromUsd,
  PRICE_SETS,
  ACTIVE_PRICE_SET,
  subscriptionPrice,
  EXPERIMENTS,
  assignArm,
  experimentPrice,
  CURRENCIES,
  READY_CURRENCIES,
  type ExperimentId,
  type PriceExperiment,
  assignArmIn,
} from '@/lib/priceBook';
import { getPlanAmount, formatAmount } from '@/lib/ziina/server';

const inr = (r: number) => r * 100;
const usd = (d: number) => Math.round(d * 100);
const aed = (d: number) => Math.round(d * 100);

describe('charmDown — always rounds DOWN to a local charm price', () => {
  it.each([
    // INR
    [inr(3_800), 'INR', inr(3_499)], // owner's example
    [inr(3_999), 'INR', inr(3_999)],
    [inr(4_000), 'INR', inr(3_999)],
    [inr(1_250), 'INR', inr(999)],
    [inr(1_499), 'INR', inr(1_499)],
    [inr(842), 'INR', inr(799)],
    [inr(210), 'INR', inr(199)],
    [inr(149), 'INR', inr(149)],
    [inr(95), 'INR', inr(89)],
    [inr(47_999), 'INR', inr(47_999)],
    [inr(52_300), 'INR', inr(51_999)],
    [4_99_50, 'INR', inr(499)], // paise dropped before rounding
    // USD
    [usd(15.4), 'USD', usd(14.99)],
    [usd(14.99), 'USD', usd(14.99)],
    [usd(5), 'USD', usd(4.99)],
    [usd(41.99), 'USD', usd(41.99)],
    [usd(125), 'USD', usd(119)],
    [usd(499), 'USD', usd(499)],
    // AED
    [aed(55.05), 'AED', aed(54.99)],
    [aed(18.33), 'AED', aed(17.99)],
    [aed(105), 'AED', aed(99.99)],
    [usd(105), 'USD', usd(99.99)],
    [aed(159), 'AED', aed(159)],
    [aed(7.33), 'AED', aed(6.99)],
    [aed(1_849), 'AED', aed(1_849)],
    [aed(1_870), 'AED', aed(1_849)],
  ] as const)('%i %s → %i', (raw, cur, want) => {
    expect(charmDown(raw, cur)).toBe(want);
  });

  it('never rounds up and is idempotent, across a sweep of amounts', () => {
    for (const cur of [...CURRENCIES, ...READY_CURRENCIES]) {
      for (let major = 1; major < 60_000; major += major < 200 ? 1 : 37) {
        const raw = major * 100 + 37;
        const c = charmDown(raw, cur);
        expect(c, `${cur} ${raw}`).toBeLessThanOrEqual(raw);
        expect(c).toBeGreaterThan(0);
        expect(charmDown(c, cur), `${cur} ${raw} not idempotent`).toBe(c);
      }
    }
  });

  it('INR results are whole rupees, so the shown price is the charged price', () => {
    for (let r = 1; r < 20_000; r += 7) expect(charmDown(r * 100 + 55, 'INR') % 100).toBe(0);
  });

  it('localizes a USD anchor to AED with a 9 ending', () => {
    expect(localizeFromUsd(usd(14.99), 'AED')).toBe(aed(54.99));
    expect(isCharmPrice(localizeFromUsd(usd(119), 'AED'), 'AED')).toBe(true);
  });
});

describe('price sets', () => {
  it('live is still the current price set until the owner approves a change', () => {
    expect(ACTIVE_PRICE_SET).toBe('current');
  });

  it('the checkout table charges exactly the active price set', () => {
    for (const sku of ['sub_monthly', 'sub_annual'] as const) {
      for (const cur of CURRENCIES) expect(getPlanAmount(sku, cur)).toBe(subscriptionPrice(sku, cur));
    }
  });

  it('every subscription price in every set is a charm price', () => {
    for (const [setId, set] of Object.entries(PRICE_SETS)) {
      for (const sku of ['sub_monthly', 'sub_annual'] as const) {
        for (const cur of CURRENCIES) {
          const amt = subscriptionPrice(sku, cur, setId as keyof typeof PRICE_SETS);
          expect(isCharmPrice(amt, cur), `${setId}/${sku}/${cur} = ${formatAmount(amt, cur)}`).toBe(true);
        }
      }
      expect(set).toBeTruthy();
    }
  });

  it('the recommended set shows the prices the research recommends', () => {
    const show = (sku: 'sub_monthly' | 'sub_annual', cur: 'INR' | 'USD' | 'AED') =>
      formatAmount(subscriptionPrice(sku, cur, 'recommended'), cur);
    expect(show('sub_monthly', 'INR')).toBe('₹999');
    expect(show('sub_monthly', 'USD')).toBe('$14.99');
    expect(show('sub_monthly', 'AED')).toBe('AED 54.99');
  });

  // Not true of the CURRENT set: ₹47,999 a year is ₹11 MORE than twelve months at ₹3,999
  // (PRICING_RESEARCH §2). The recommended set fixes it.
  it('the recommended yearly plan is cheaper than twelve months, in every currency', () => {
    for (const cur of [...CURRENCIES, ...READY_CURRENCIES]) {
      expect(subscriptionPrice('sub_annual', cur, 'recommended')).toBeLessThan(
        12 * subscriptionPrice('sub_monthly', cur, 'recommended'),
      );
    }
  });

  it('prices GBP and EUR (accepted by Ziina, not yet wired to checkout) from the USD anchor', () => {
    expect(subscriptionPrice('sub_monthly', 'GBP', 'recommended')).toBe(10_99);
    expect(subscriptionPrice('sub_monthly', 'EUR', 'recommended')).toBe(12_99);
    expect(subscriptionPrice('sub_annual', 'AED', 'recommended')).toBe(429_00);
  });
});

describe('funnel price experiments (spec §9 E3/E4)', () => {
  const ids = Object.keys(EXPERIMENTS) as ExperimentId[];

  it('every experiment has its control among its arms and every arm price is a charm price', () => {
    for (const id of ids) {
      const exp = EXPERIMENTS[id];
      expect(Object.keys(exp.arms)).toContain(exp.control);
      for (const cur of CURRENCIES) {
        for (const arm of Object.keys(exp.arms)) {
          expect(isCharmPrice(experimentPrice(id, arm, cur), cur), `${id}/${arm}/${cur}`).toBe(true);
        }
      }
    }
  });

  it('carries the spec arms: E3 ₹149/₹199/₹299, E4 ₹499/₹799/₹999 and $41.99 vs $14.99', () => {
    const inrArms = (id: ExperimentId) =>
      Object.keys(EXPERIMENTS[id].arms).map((a) => experimentPrice(id, a, 'INR') / 100).sort((x, y) => x - y);
    expect(inrArms('price_report')).toEqual([149, 199, 299]);
    expect(inrArms('price_monthly_in')).toEqual([499, 799, 999]);
    const usdArms = Object.keys(EXPERIMENTS.price_monthly_row.arms).map((a) => experimentPrice('price_monthly_row', a, 'USD'));
    expect(usdArms.sort()).toEqual([usd(14.99), usd(41.99)].sort());
    expect(experimentPrice('price_bump', null, 'INR')).toBe(inr(99));
    expect(experimentPrice('price_bump', null, 'USD')).toBe(usd(1.99));
    expect(experimentPrice('price_downsell', null, 'INR')).toBe(inr(149));
  });

  it('switched off by default: everyone sees control', () => {
    for (const id of ids) {
      expect(EXPERIMENTS[id].enabled).toBe(false);
      expect(assignArm(id, 'visitor-a', 'INR')).toBe(EXPERIMENTS[id].control);
    }
  });

  it('an unknown or stale arm falls back to control instead of an unpriced checkout', () => {
    expect(experimentPrice('price_report', 'nope', 'INR')).toBe(inr(199));
    expect(experimentPrice('price_report', undefined, 'INR')).toBe(inr(199));
  });
});

describe('arm assignment when an experiment is switched on', () => {
  const exp: PriceExperiment = {
    sku: 'sub_monthly',
    enabled: true,
    control: 'a',
    market: 'IN',
    arms: {
      a: { price: { INR: 99900, USD: 1499 }, weight: 1 },
      b: { price: { INR: 79900, USD: 1499 }, weight: 1 },
      c: { price: { INR: 49900, USD: 1499 }, weight: 2 },
    },
  };

  it('is sticky: the same visitor always gets the same arm (no price change on refresh)', () => {
    for (let i = 0; i < 50; i++) {
      const id = `visitor-${i}`;
      expect(assignArmIn(exp, 'e', id, 'INR')).toBe(assignArmIn(exp, 'e', id, 'INR'));
    }
  });

  it('splits traffic roughly by weight', () => {
    const n = 8000;
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < n; i++) counts[assignArmIn(exp, 'e', `v${i}`, 'INR')]!++;
    expect(counts.a! / n).toBeGreaterThan(0.2);
    expect(counts.a! / n).toBeLessThan(0.3);
    expect(counts.c! / n).toBeGreaterThan(0.45);
    expect(counts.c! / n).toBeLessThan(0.55);
  });

  it('leaves visitors outside the market on control', () => {
    for (let i = 0; i < 50; i++) expect(assignArmIn(exp, 'e', `v${i}`, 'USD')).toBe('a');
  });
});
