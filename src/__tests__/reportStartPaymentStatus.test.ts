import { describe, expect, it } from 'vitest';
import { resolveTrustedPaymentStatus } from '@/app/api/reports/start/route';

type LookupResult = {
  data: { ziina_intent_id: string } | null;
  error: { message: string } | null;
};

class PaymentLookupQuery {
  constructor(private readonly result: LookupResult) {}

  select() {
    return this;
  }

  eq() {
    return this;
  }

  limit() {
    return this;
  }

  async maybeSingle() {
    return this.result;
  }
}

function createPaymentLookupDb(result: LookupResult) {
  return {
    from(table: string) {
      if (table !== 'ziina_payments') {
        throw new Error(`unexpected table ${table}`);
      }
      return new PaymentLookupQuery(result);
    },
  };
}

describe('resolveTrustedPaymentStatus', () => {
  it('trusts a completed Ziina payment bound to the report owner', async () => {
    const db = createPaymentLookupDb({
      data: { ziina_intent_id: 'intent_1' },
      error: null,
    });

    await expect(
      resolveTrustedPaymentStatus(
        db as never,
        'report_1',
        'user_1',
        { payment_status: 'free', plan_type: '7day' },
        null,
        false,
      ),
    ).resolves.toBe('paid');
  });

  it('does not trust a non-admin client supplied paid status', async () => {
    const db = createPaymentLookupDb({ data: null, error: null });

    await expect(
      resolveTrustedPaymentStatus(
        db as never,
        'report_1',
        'user_1',
        { payment_status: 'paid', plan_type: '7day' },
        null,
        false,
      ),
    ).resolves.toBe('unpaid');
  });

  it('fails closed when completed payment lookup errors', async () => {
    const db = createPaymentLookupDb({
      data: null,
      error: { message: 'database timeout' },
    });

    await expect(
      resolveTrustedPaymentStatus(
        db as never,
        'report_1',
        'user_1',
        { plan_type: '7day' },
        {
          user_id: 'user_1',
          status: 'generating',
          report_data: null,
          generation_started_at: null,
          plan_type: '7day',
          payment_status: 'paid',
          payment_provider: 'ziina',
        },
        false,
      ),
    ).rejects.toThrow('completed payment lookup failed');
  });
});
