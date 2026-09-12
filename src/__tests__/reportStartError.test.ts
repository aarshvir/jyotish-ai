import { describe, it, expect } from 'vitest';
import { reportStartErrorMessage, GENERIC_REPORT_START_ERROR } from '@/lib/onboard/reportStartError';

describe('reportStartErrorMessage — what a visitor sees when a report fails to start', () => {
  it('never shows a raw HTML page (the 2026-09-12 banner)', () => {
    const body = {
      error:
        'Error: Ephemeris HTTP 404: <!DOCTYPE html><html lang="en" class="outfit_ca35ecd4-module__VNkuCW__variable"><head><meta charSet="utf-8"/>',
    };
    expect(reportStartErrorMessage(body)).toBe(GENERIC_REPORT_START_ERROR);
  });

  it.each([
    ['an Error: prefix', 'Error: something broke'],
    ['an HTTP status fragment', 'Upstream returned HTTP 502'],
    ['a URL', 'Could not reach https://ephemeris.internal/health'],
    ['JSON', '{"message":"boom"}'],
    ['a stack frame', 'failed at Object.run (orchestrator.ts:12)'],
    ['a network code', 'ECONNREFUSED 127.0.0.1:8000'],
    ['an over-long message', 'x'.repeat(161)],
  ])('replaces %s with the generic sentence', (_label, error) => {
    expect(reportStartErrorMessage({ error })).toBe(GENERIC_REPORT_START_ERROR);
  });

  it('passes through a short sentence written for people', () => {
    const error = 'You have already generated your free report this month.';
    expect(reportStartErrorMessage({ error })).toBe(error);
  });

  it('explains a busy queue plainly', () => {
    expect(reportStartErrorMessage({ code: 'INNGEST_DISPATCH_FAILED', error: 'dispatch failed' })).toMatch(/queue is busy/);
  });

  it('falls back when there is nothing usable', () => {
    expect(reportStartErrorMessage(undefined)).toBe(GENERIC_REPORT_START_ERROR);
    expect(reportStartErrorMessage({})).toBe(GENERIC_REPORT_START_ERROR);
    expect(reportStartErrorMessage({ error: '   ' })).toBe(GENERIC_REPORT_START_ERROR);
  });
});
