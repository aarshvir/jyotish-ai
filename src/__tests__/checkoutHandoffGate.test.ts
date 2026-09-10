import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Regression: #216 replaced `window.location.href = redirectUrl` with the Ziina
 * hand-off card, gated on `if (data.redirectUrl)`. But create-intent returns a
 * redirectUrl for several outcomes that are NOT a Ziina checkout:
 *
 *   - a 100%-off code grants the unlock outright  -> { freeUnlock, redirectUrl: '/kundali?unlocked=1' }
 *   - an already-unlocked buyer                   -> { alreadyUnlocked, redirectUrl: '/kundali?unlocked=1' }
 *   - an already-paid report                      -> { alreadyPaid, redirectUrl: '/report/x?payment_status=paid' }
 *
 * None of those carry an `amount`, so `formatAmount(data.amount ?? 0, ...)`
 * rendered "$0.00" and the buyer was shown "One more step... it will say Pay
 * <merchant> and show $0.00... enter any Visa or Mastercard" for a purchase that
 * had already been granted.
 *
 * The card's whole purpose is to state the exact charge before the redirect, so
 * it may only appear when there IS an exact charge. These forms are client
 * components and the suite is node-only, so the invariant is asserted against
 * the source: no zero-fallback price, and an amount check before setHandoff.
 */
const FORMS = [
  join(process.cwd(), 'src', 'app', 'kundali', 'KundaliForm.tsx'),
  join(process.cwd(), 'src', 'app', 'synastry', 'SynastryForm.tsx'),
  join(process.cwd(), 'src', 'app', 'onboard', '_OnboardForm.tsx'),
];

function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe.each(FORMS)('%s only promises a Ziina charge it can name', (formPath) => {
  const src = withoutComments(readFileSync(formPath, 'utf8'));

  it('never formats a price from a missing amount', () => {
    expect(src).not.toMatch(/formatAmount\(\s*\w+(?:\.\w+)*\s*\?\?/);
  });

  it('checks the amount is a number before showing the hand-off', () => {
    const guard = /typeof\s+\w+\.amount\s*!==\s*'number'/;
    expect(src).toMatch(guard);

    const guardAt = src.search(guard);
    const handoffAt = src.indexOf('setHandoff({');
    expect(handoffAt).toBeGreaterThan(-1);
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(handoffAt);
  });

  it('still redirects when there is no charge to announce', () => {
    expect(src).toMatch(/window\.location\.href\s*=\s*\w+\.redirectUrl/);
  });
});
