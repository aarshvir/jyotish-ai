import { describe, expect, it } from 'vitest';
import {
  assertMonthlyExtensionSucceeded,
  isMonthlyUpgradeReady,
} from './monthlyUpgradeSafety';

describe('monthly upgrade safety', () => {
  it('does not allow checkout while the seven-day report is still generating', () => {
    expect(
      isMonthlyUpgradeReady({
        status: 'generating',
        report_data: { days: Array.from({ length: 7 }, (_, index) => ({ index })) },
      }),
    ).toBe(false);
  });

  it('does not allow checkout when a complete report is missing its seven days', () => {
    expect(isMonthlyUpgradeReady({ status: 'complete', report_data: { days: [] } })).toBe(false);
    expect(isMonthlyUpgradeReady({ status: 'complete', report_data: null })).toBe(false);
  });

  it('allows checkout only after the complete seven-day base report is durable', () => {
    expect(
      isMonthlyUpgradeReady({
        status: 'complete',
        report_data: { days: Array.from({ length: 7 }, (_, index) => ({ index })) },
      }),
    ).toBe(true);
  });

  it('throws on logical extension failures so Inngest retries them', () => {
    expect(() =>
      assertMonthlyExtensionSucceeded({ ok: false, message: 'Report has fewer than 7 days' }),
    ).toThrow('Monthly report extension failed: Report has fewer than 7 days');
    expect(() =>
      assertMonthlyExtensionSucceeded({ ok: true, message: 'Extended to 30 days' }),
    ).not.toThrow();
  });
});
