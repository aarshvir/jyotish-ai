import { describe, expect, it } from 'vitest';
import { minForecastDaysForPlan } from './forecastDayCount';

describe('minForecastDaysForPlan', () => {
  it('requires 1 day for free/preview', () => {
    expect(minForecastDaysForPlan('free')).toBe(1);
    expect(minForecastDaysForPlan('preview')).toBe(1);
  });

  it('requires 30 days for monthly / annual / monthly_upgrade', () => {
    expect(minForecastDaysForPlan('monthly')).toBe(30);
    expect(minForecastDaysForPlan('annual')).toBe(30);
    expect(minForecastDaysForPlan('monthly_upgrade')).toBe(30);
  });

  it('requires 7 days for 7day and unknown', () => {
    expect(minForecastDaysForPlan('7day')).toBe(7);
    expect(minForecastDaysForPlan('')).toBe(7);
    expect(minForecastDaysForPlan(null)).toBe(7);
  });
});
