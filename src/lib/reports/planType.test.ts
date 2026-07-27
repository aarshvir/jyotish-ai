import { describe, expect, it } from 'vitest';
import { forecastDayCount, isForecastPlanType, toReportPlanType } from './planType';

describe('toReportPlanType', () => {
  it('maps monthly_upgrade payment SKU to monthly generation plan', () => {
    expect(toReportPlanType('monthly_upgrade')).toBe('monthly');
    expect(toReportPlanType('Monthly_Upgrade')).toBe('monthly');
  });

  it('maps free to preview', () => {
    expect(toReportPlanType('free')).toBe('preview');
  });

  it('preserves direct forecast plans', () => {
    expect(toReportPlanType('7day')).toBe('7day');
    expect(toReportPlanType('monthly')).toBe('monthly');
    expect(toReportPlanType('annual')).toBe('annual');
    expect(toReportPlanType('preview')).toBe('preview');
  });

  it('defaults empty to 7day', () => {
    expect(toReportPlanType('')).toBe('7day');
    expect(toReportPlanType(null)).toBe('7day');
    expect(toReportPlanType(undefined)).toBe('7day');
  });
});

describe('forecastDayCount', () => {
  it('gives 30 days for monthly_upgrade (not 7)', () => {
    expect(forecastDayCount('monthly_upgrade', false)).toBe(30);
    expect(forecastDayCount('monthly', false)).toBe(30);
    expect(forecastDayCount('annual', false)).toBe(30);
  });

  it('gives 7 days for 7day and 1 for preview', () => {
    expect(forecastDayCount('7day', false)).toBe(7);
    expect(forecastDayCount('preview', true)).toBe(1);
  });
});

describe('isForecastPlanType', () => {
  it('treats monthly_upgrade as a forecast plan', () => {
    expect(isForecastPlanType('monthly_upgrade')).toBe(true);
    expect(isForecastPlanType('kundali')).toBe(false);
  });
});
