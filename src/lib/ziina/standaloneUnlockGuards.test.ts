import { describe, expect, it } from 'vitest';
import { decideStandaloneUnlockCheckout } from './standaloneUnlockGuards';

describe('decideStandaloneUnlockCheckout', () => {
  it('blocks a second charge when the unlock row already exists', () => {
    expect(
      decideStandaloneUnlockCheckout({
        hasUnlockRow: true,
        hasCompletedPayment: false,
        reusablePending: { id: 'pi_old', redirect_url: 'https://pay.example/old', amount: 999 },
      }),
    ).toEqual({ action: 'already_unlocked' });
  });

  it('blocks a second charge when a completed standalone payment exists (even if unlock heal lagged)', () => {
    expect(
      decideStandaloneUnlockCheckout({
        hasUnlockRow: false,
        hasCompletedPayment: true,
        reusablePending: null,
      }),
    ).toEqual({ action: 'already_unlocked' });
  });

  it('reuses a still-payable recent pending intent instead of minting another', () => {
    expect(
      decideStandaloneUnlockCheckout({
        hasUnlockRow: false,
        hasCompletedPayment: false,
        reusablePending: { id: 'pi_1', redirect_url: 'https://pay.example/1', amount: 999 },
      }),
    ).toEqual({
      action: 'reuse_pending',
      intentId: 'pi_1',
      redirectUrl: 'https://pay.example/1',
      amount: 999,
    });
  });

  it('mints a new intent only when nothing is unlocked or reusable', () => {
    expect(
      decideStandaloneUnlockCheckout({
        hasUnlockRow: false,
        hasCompletedPayment: false,
        reusablePending: null,
      }),
    ).toEqual({ action: 'mint_new' });
  });
});
