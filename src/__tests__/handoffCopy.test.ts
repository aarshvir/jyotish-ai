import { describe, it, expect } from 'vitest';
import { handoffCopy } from '@/lib/checkout/handoffCopy';

describe('checkout hand-off copy', () => {
  it('warns Indian buyers that their card may block international payments', () => {
    // RBI leaves international usage OFF by default; Ziina is UAE-licensed, so an
    // otherwise-willing buyer gets declined with no explanation.
    expect(handoffCopy('INR', 'aarshvir').showInternationalCardHelp).toBe(true);
  });

  it('does not show international-card help outside India', () => {
    expect(handoffCopy('USD', 'aarshvir').showInternationalCardHelp).toBe(false);
    expect(handoffCopy('AED', 'aarshvir').showInternationalCardHelp).toBe(false);
  });

  it('mentions the missing UPI option only to Indian buyers', () => {
    expect(handoffCopy('INR', 'aarshvir').showUpiNote).toBe(true);
    expect(handoffCopy('USD', 'aarshvir').showUpiNote).toBe(false);
    expect(handoffCopy('AED', 'aarshvir').showUpiNote).toBe(false);
  });

  it('explains the merchant name while Ziina still shows a personal name', () => {
    expect(handoffCopy('INR', 'aarshvir').explainMerchantName).toBe(true);
  });

  it('drops the explanation once the Ziina account is renamed to the brand', () => {
    // The whole paragraph disappears by itself when the dashboard is fixed —
    // no code change needed, just NEXT_PUBLIC_ZIINA_MERCHANT_NAME.
    expect(handoffCopy('INR', 'VedicHour').explainMerchantName).toBe(false);
    expect(handoffCopy('INR', '  vedichour  ').explainMerchantName).toBe(false);
  });
});
