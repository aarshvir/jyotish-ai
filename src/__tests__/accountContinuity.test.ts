import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { AuthSessionMissingError } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ getUser: vi.fn(), checkout: vi.fn(), redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mock.getUser } }) }));
vi.mock('@/lib/commercial/availability', () => ({ isCommercialCheckoutEnabled: mock.checkout }));
vi.mock('@/components/dashboard/AccountDashboard', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({ redirect: mock.redirect }));
import DashboardPage from '@/app/(app)/dashboard/page';

describe('dashboard authentication and commercial boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React);
    mock.getUser.mockReset(); mock.checkout.mockReset(); mock.redirect.mockReset();
    mock.checkout.mockReturnValue(false);
    mock.redirect.mockImplementation((path: string) => { throw new Error(`Redirect: ${path}`); });
  });
  afterEach(() => vi.unstubAllGlobals());
  it.each([null, new AuthSessionMissingError()])('redirects a genuinely absent session to sign-in', async error => {
    mock.getUser.mockResolvedValue({ data: { user: null }, error });
    await expect(DashboardPage({ searchParams: { tab: 'reports' } })).rejects.toThrow('Redirect: /login?next=%2Fdashboard%3Ftab%3Dreports');
    expect(mock.checkout).not.toHaveBeenCalled();
  });
  it('does not treat genuine service errors as a missing session', async () => {
    mock.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Network unavailable') });
    const page = await DashboardPage({ searchParams: {} });
    expect(mock.redirect).not.toHaveBeenCalled();
    expect(page.props.checkoutEnabled).toBe(false);
  });
  it('preserves an authenticated account and passes only the server availability flag', async () => {
    mock.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
    mock.checkout.mockReturnValue(true);
    const page = await DashboardPage({ searchParams: {} });
    expect(mock.redirect).not.toHaveBeenCalled();
    expect(page.props.checkoutEnabled).toBe(true);
  });
  it('does not embed an untrusted redirect destination', async () => {
    mock.getUser.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() });
    await expect(DashboardPage({ searchParams: { tab: '//outside.example' } })).rejects.toThrow('Redirect: /login?next=%2Fdashboard');
  });
});

describe('account continuity source contracts', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
  const dashboard = read('src/components/dashboard/AccountDashboard.tsx');
  const subscription = read('src/components/dashboard/SubscriptionCard.tsx');
  it('preserves explicit ownership queries without privileged access or deletion', () => {
    expect(dashboard).toContain(".eq('id', user.id)");
    expect(dashboard).toContain(".eq('user_id', user.id)");
    expect(dashboard).not.toMatch(/createServiceClient|\.delete\(/);
    expect(dashboard).toContain("credentials: 'include'");
  });
  it('gates renewals and keeps existing entitlements separate', () => {
    expect(subscription).toContain('checkoutEnabled = false');
    expect(subscription).toContain('checkoutEnabled && (!sub.active');
    expect(subscription).toContain('sub.active && !cooling');
    expect(dashboard).not.toContain('@/lib/commercial/availability');
    expect(subscription).not.toContain('@/lib/commercial/availability');
  });
  it('does not advertise unavailable purchase flows in empty dashboard states', () => {
    expect(dashboard).not.toMatch(/href="\/(start|pricing|kundali|synastry)"/);
    expect(dashboard).not.toContain('SynastryTeaser');
    expect(dashboard).toContain('/free-kundli');
    expect(dashboard).toContain('/sample-report');
    expect(dashboard).toContain('/help/existing-reports');
  });
  it('keeps failed loading distinct from empty records and disables destructive fallback saving', () => {
    expect(dashboard).toContain('if (!repsError) setReports');
    expect(dashboard).toContain('if (!paymentsRes.unavailable) setPayments');
    expect(dashboard).toContain('disabled={profileUnavailable || settingsSaving}');
    expect(dashboard).not.toContain("r.status === 'error' || isStale(r)");
  });
  it('uses secure supported auth recovery without double decoding or GET credentials', () => {
    const signin = read('src/components/help/AccountSignIn.tsx');
    expect(signin).not.toContain('decodeURIComponent(');
    expect(signin).toContain('safeInternalPath(');
    expect(signin).toContain('resetPasswordForEmail(');
    expect(signin).toContain('finally { finish(); }');
    expect(signin).toContain('method="post"');
    expect(signin).not.toMatch(/name="(?:email|password)"/);
  });
});
