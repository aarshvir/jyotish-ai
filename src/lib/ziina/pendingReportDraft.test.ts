import { describe, expect, it } from 'vitest';
import { buildPendingReportDraft } from './pendingReportDraft';

describe('buildPendingReportDraft', () => {
  it('preserves paid checkout birth details before redirecting to Ziina', () => {
    const draft = buildPendingReportDraft({
      reportId: 'report_1',
      userId: 'user_1',
      userEmail: 'buyer@example.test',
      planType: '7day',
      name: 'Aarsh',
      birth_date: '1990-01-02',
      birth_time: '03:04',
      birth_city: 'Mumbai, India',
      birth_lat: '19.076',
      birth_lng: 72.8777,
      current_city: 'Dubai',
      current_lat: '25.2048',
      current_lng: '55.2708',
      timezone_offset: '240',
      forecast_start: '2026-05-20',
    });

    expect(draft).toMatchObject({
      id: 'report_1',
      user_id: 'user_1',
      user_email: 'buyer@example.test',
      native_name: 'Aarsh',
      birth_date: '1990-01-02',
      birth_time: '03:04:00',
      birth_city: 'Mumbai, India',
      birth_lat: 19.076,
      birth_lng: 72.8777,
      current_city: 'Dubai',
      current_lat: 25.2048,
      current_lng: 55.2708,
      timezone_offset: 240,
      plan_type: '7day',
      report_start_date: '2026-05-20',
      status: 'pending_payment',
      payment_status: 'unpaid',
      payment_provider: null,
    });
    expect(typeof draft.updated_at).toBe('string');
  });

  it('fails closed instead of creating an unrecoverable paid checkout without birth data', () => {
    expect(() =>
      buildPendingReportDraft({
        reportId: 'report_1',
        userId: 'user_1',
        planType: 'monthly',
        birth_date: '1990-01-02',
        birth_time: '03:04',
        birth_city: 'Mumbai, India',
        birth_lat: 19.076,
      }),
    ).toThrow('birth_lng required');
  });
});
