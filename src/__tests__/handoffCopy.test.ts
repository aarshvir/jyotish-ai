import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { handoffCopy } from '@/lib/checkout/handoffCopy';

describe('handoffCopy', () => {
  it('shows international-card help only for INR', () => {
    expect(handoffCopy('INR').showInternationalCardHelp).toBe(true);
    expect(handoffCopy('USD').showInternationalCardHelp).toBe(false);
    expect(handoffCopy('AED').showInternationalCardHelp).toBe(false);
  });

  it('mentions UPI only for INR', () => {
    expect(handoffCopy('INR').showUpiNote).toBe(true);
    expect(handoffCopy('USD').showUpiNote).toBe(false);
    expect(handoffCopy('AED').showUpiNote).toBe(false);
  });

  it('never names the account holder on the hand-off card', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/checkout/PaymentHandoff.tsx'), 'utf8');
    expect(src).not.toMatch(/merchantName|ZIINA_MERCHANT_NAME|Pay \{/);
  });
});
