import { describe, expect, it } from 'vitest';
import { quizPaymentReturnBanner } from '@/lib/checkout/quizPaymentReturn';

describe('quizPaymentReturnBanner', () => {
  it('treats payment=error as still-confirming, not as an uncharged failure', () => {
    // /api/ziina/verify redirects here when Ziina is completed but finalize failed.
    expect(quizPaymentReturnBanner('error')).toBe(quizPaymentReturnBanner('pending'));
    expect(quizPaymentReturnBanner('error')).toMatch(/still being confirmed/i);
    expect(quizPaymentReturnBanner('error')).not.toMatch(/nothing was charged/i);
  });

  it('tells the buyer nothing was charged only when checkout did not complete', () => {
    expect(quizPaymentReturnBanner('cancelled')).toMatch(/nothing was charged/i);
    expect(quizPaymentReturnBanner('failed')).toMatch(/nothing was charged/i);
    expect(quizPaymentReturnBanner('incomplete')).toMatch(/nothing was charged/i);
  });

  it('is silent when there is no payment return', () => {
    expect(quizPaymentReturnBanner(null)).toBeNull();
    expect(quizPaymentReturnBanner('')).toBeNull();
  });
});
