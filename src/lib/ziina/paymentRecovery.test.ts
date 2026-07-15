import { describe, expect, it } from 'vitest';
import { buildStatusPayload } from '@/app/api/reports/[id]/status/route';
import { confirmedPaymentStatus, isPaymentConfirmed } from './paymentRecovery';

describe('payment recovery status', () => {
  it('confirms a paid report even while generation remains pending', () => {
    const payload = buildStatusPayload(
      'report-1',
      { status: 'pending', payment_status: 'paid', plan_type: 'monthly' },
      false,
    );

    expect(payload).toMatchObject({
      status: 'pending',
      payment_status: 'paid',
    });
    expect(isPaymentConfirmed(payload.payment_status)).toBe(true);
  });

  it('does not infer payment from an advanced generation status', () => {
    const payload = buildStatusPayload(
      'report-2',
      { status: 'generating', payment_status: 'unpaid', plan_type: 'monthly' },
      false,
    );

    expect(payload.payment_status).toBeNull();
    expect(isPaymentConfirmed(payload.payment_status)).toBe(false);
  });

  it('only exposes server-confirmed paid states', () => {
    expect(confirmedPaymentStatus('paid')).toBe('paid');
    expect(confirmedPaymentStatus('promo')).toBe('promo');
    expect(confirmedPaymentStatus('bypass')).toBeNull();
    expect(confirmedPaymentStatus('unpaid')).toBeNull();
  });
});
