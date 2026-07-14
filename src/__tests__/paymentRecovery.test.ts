import { describe, expect, it } from 'vitest';
import { buildStatusPayload } from '@/app/api/reports/[id]/status/route';

describe('pending payment recovery', () => {
  it('exposes confirmed payment independently of pending generation', () => {
    const payload = buildStatusPayload(
      'report-1',
      {
        status: 'pending',
        payment_status: 'paid',
        plan_type: '7day',
        report_data: null,
      },
      false,
    );

    expect(payload).toMatchObject({
      id: 'report-1',
      status: 'pending',
      payment_status: 'paid',
      isComplete: false,
      report: null,
    });
  });
});
