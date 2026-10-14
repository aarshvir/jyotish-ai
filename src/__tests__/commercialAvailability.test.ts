import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { commercialAvailability } from '@/lib/commercial/availability';
import { blueprintSalesOpen } from '@/lib/funnel/offer';
import { buildLlmsFullTxt, buildLlmsTxt, vedicHourOffers } from '@/lib/seo/aiVisibility';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), createIntent: vi.fn(), serviceClient: vi.fn() }));
vi.mock('@/lib/api/requireAuth', () => ({ requireAuth: mocks.auth }));
vi.mock('@/lib/supabase/admin', () => ({ createServiceClient: mocks.serviceClient }));
vi.mock('@/lib/ziina/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ziina/server')>()),
  isZiinaConfigured: () => true,
  createPaymentIntent: mocks.createIntent,
}));

import { POST as createIntent } from '@/app/api/ziina/create-intent/route';
import { POST as upgrade } from '@/app/api/ziina/upgrade/route';
import { GET as offer } from '@/app/api/quiz/offer/route';
import { GET as geo } from '@/app/api/geo/route';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('COMMERCIAL_CHECKOUT_ENABLED', '');
  vi.stubEnv('BLUEPRINT_SALES_ENABLED', '1');
  mocks.auth.mockResolvedValue({ user: { id: 'synthetic-test-user' }, mode: 'session' });
});
afterEach(() => vi.unstubAllEnvs());

describe('unresolved commercial readiness', () => {
  it('refuses new and legacy payment mutations before calling the provider or writing a draft', async () => {
    for (const handler of [createIntent, upgrade]) {
      const response = await handler(new NextRequest('https://www.vedichour.com/api/ziina/create-intent', {
        method: 'POST', body: JSON.stringify({ planType: 'sub_monthly', reportId: 'synthetic-report' }),
      }));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ code: 'COMMERCIAL_UNAVAILABLE' });
    }
    expect(mocks.createIntent).not.toHaveBeenCalled();
    expect(mocks.serviceClient).not.toHaveBeenCalled();
  });

  it('keeps authentication enforced even when purchases are unavailable', async () => {
    mocks.auth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const response = await createIntent(new NextRequest('https://www.vedichour.com/api/ziina/create-intent', { method: 'POST' }));
    expect(response.status).toBe(401);
    expect(mocks.serviceClient).not.toHaveBeenCalled();
  });

  it('hides unavailable price offers from both funnels and geo pricing', async () => {
    const request = new NextRequest('https://www.vedichour.com/api/quiz/offer');
    const info = await (await offer(request)).json();
    expect(info).toMatchObject({ checkoutEnabled: false, blueprintOpen: false, status: 'unavailable' });
    expect(Object.values(info.prices).every((p) => p === null)).toBe(true);
    expect(await (await geo(request)).json()).toMatchObject({ checkoutEnabled: false, prices: {} });
    expect(blueprintSalesOpen()).toBe(false);
  });

  it('publishes only the free offer and accurate assistant descriptions while closed', () => {
    const site = 'https://www.vedichour.com';
    expect(vedicHourOffers(site)).toHaveLength(1);
    expect(vedicHourOffers(site)[0]).toMatchObject({ price: '0', url: `${site}/free-kundli` });
    for (const text of [buildLlmsTxt(site), buildLlmsFullTxt(site)]) {
      expect(text).toContain('currently unavailable');
      expect(text).toContain('Existing account reports remain accessible');
      expect(text).not.toContain('$41.99');
    }
  });

  it('requires the explicit release flag, independently of the blueprint switch', () => {
    for (const value of ['', 'false', '1', 'TRUE']) {
      vi.stubEnv('COMMERCIAL_CHECKOUT_ENABLED', value);
      expect(commercialAvailability().checkoutEnabled).toBe(false);
    }
    vi.stubEnv('COMMERCIAL_CHECKOUT_ENABLED', 'true');
    expect(commercialAvailability().checkoutEnabled).toBe(true);
    expect(blueprintSalesOpen()).toBe(true);
  });
});
