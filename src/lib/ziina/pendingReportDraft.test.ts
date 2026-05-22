import { describe, expect, it } from 'vitest';
import { buildPendingPaymentReportDraft } from './pendingReportDraft';

describe('buildPendingPaymentReportDraft', () => {
  it('builds a durable paid-checkout report draft from onboarding fields', () => {
    expect(buildPendingPaymentReportDraft({
      name: 'Aarav Sharma',
      birth_date: '1990-05-18',
      birth_time: '06:30',
      birth_city: 'Lucknow, India',
      birth_lat: '26.8467',
      birth_lng: 80.9462,
      current_city: 'Dubai',
      current_lat: '25.2048',
      current_lng: '55.2708',
      timezone_offset: '240',
      forecast_start: '2026-05-19',
    })).toEqual({
      native_name: 'Aarav Sharma',
      birth_date: '1990-05-18',
      birth_time: '06:30:00',
      birth_city: 'Lucknow, India',
      birth_lat: 26.8467,
      birth_lng: 80.9462,
      current_city: 'Dubai',
      current_lat: 25.2048,
      current_lng: 55.2708,
      timezone_offset: 240,
      forecast_start: '2026-05-19',
    });
  });

  it('keeps valid zero coordinates and rejects missing birth details', () => {
    expect(buildPendingPaymentReportDraft({
      name: 'Equator Native',
      birth_date: '1990-05-18',
      birth_time: '00:00:00',
      birth_city: 'Null Island',
      birth_lat: 0,
      birth_lng: 0,
    })?.birth_lat).toBe(0);

    expect(buildPendingPaymentReportDraft({
      name: 'Missing Coords',
      birth_date: '1990-05-18',
      birth_time: '06:30',
      birth_city: 'Lucknow, India',
    })).toBeNull();
  });
});
