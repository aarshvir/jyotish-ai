import { describe, it, expect } from 'vitest';
import { isBypassAllowedForPath, isJobTokenAllowedForPath, isSessionAllowedForPath } from './bypassPolicy';

const DEV = { isProduction: false, allowInProduction: false };
const PROD = { isProduction: true, allowInProduction: false };
const PROD_OPTED_IN = { isProduction: true, allowInProduction: true };

describe('bypass token route policy', () => {
  it('authenticates the internal pipeline routes outside production', () => {
    expect(isBypassAllowedForPath('/api/agents/ephemeris', DEV)).toBe(true);
    expect(isBypassAllowedForPath('/api/commentary/hourly-batch', DEV)).toBe(true);
    expect(isBypassAllowedForPath('/api/validation/report', DEV)).toBe(true);
  });

  it('authenticates the report surface the e2e scripts drive', () => {
    expect(isBypassAllowedForPath('/api/reports/start', DEV)).toBe(true);
    expect(isBypassAllowedForPath('/api/reports/abc-123/status', DEV)).toBe(true);
    expect(isBypassAllowedForPath('/api/testing/generate', DEV)).toBe(true);
    expect(isBypassAllowedForPath('/api/debug/report-status', DEV)).toBe(true);
  });

  it('never authenticates destructive or money-handling endpoints', () => {
    for (const path of [
      '/api/account/delete',
      '/api/account/export',
      '/api/user/charts',
      '/api/user/payments',
      '/api/ziina/create-intent',
      '/api/ziina/upgrade',
      '/api/report/pdf',
      '/api/synastry/compute',
      '/api/kundali/compute',
      '/api/admin/users',
    ]) {
      expect(isBypassAllowedForPath(path, DEV), path).toBe(false);
    }
  });

  it('is refused on production unless explicitly opted in', () => {
    expect(isBypassAllowedForPath('/api/agents/ephemeris', PROD)).toBe(false);
    expect(isBypassAllowedForPath('/api/reports/start', PROD)).toBe(false);
    expect(isBypassAllowedForPath('/api/agents/ephemeris', PROD_OPTED_IN)).toBe(true);
  });

  it('opting in on production still does not widen the route allowlist', () => {
    expect(isBypassAllowedForPath('/api/account/delete', PROD_OPTED_IN)).toBe(false);
  });
});

describe('job token route policy', () => {
  it('accepts only the agent / commentary / validation routes it is minted for', () => {
    expect(isJobTokenAllowedForPath('/api/agents/daily-grid')).toBe(true);
    expect(isJobTokenAllowedForPath('/api/commentary/months-first')).toBe(true);
    expect(isJobTokenAllowedForPath('/api/validation/report')).toBe(true);
  });

  it('cannot be replayed against user-facing endpoints', () => {
    for (const path of [
      '/api/reports/start',
      '/api/reports/abc-123/status',
      '/api/reports/abc-123/ask',
      '/api/account/delete',
      '/api/ziina/upgrade',
    ]) {
      expect(isJobTokenAllowedForPath(path), path).toBe(false);
    }
  });
});

describe('customer sessions on model-spending routes', () => {
  const PROD_USER = { isProduction: true, isAdmin: false };
  const PROD_ADMIN = { isProduction: true, isAdmin: true };
  const DEV_USER = { isProduction: false, isAdmin: false };

  it('refuses a customer session on commentary and agent routes in production', () => {
    for (const path of ['/api/commentary/hourly-batch', '/api/commentary/weeks-synthesis', '/api/agents/nativity', '/api/agents/forecast']) {
      expect(isSessionAllowedForPath(path, PROD_USER)).toBe(false);
    }
  });

  it('keeps the compute-only ephemeris route open to signed-in sessions', () => {
    expect(isSessionAllowedForPath('/api/agents/ephemeris', PROD_USER)).toBe(true);
    expect(isSessionAllowedForPath('/api/agents/ephemeris-extra', PROD_USER)).toBe(false);
  });

  it('lets admins and non-production sessions through', () => {
    expect(isSessionAllowedForPath('/api/commentary/hourly-batch', PROD_ADMIN)).toBe(true);
    expect(isSessionAllowedForPath('/api/commentary/hourly-batch', DEV_USER)).toBe(true);
  });

  it('leaves every other route to its own checks', () => {
    for (const path of ['/api/reports/abc/hourly-day', '/api/subscription/status', '/api/ziina/create-intent']) {
      expect(isSessionAllowedForPath(path, PROD_USER)).toBe(true);
    }
  });
});
