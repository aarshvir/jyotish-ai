export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { countryToCurrency, ZIINA_PLANS, getPlanAmount, formatAmount, type SupportedCurrency } from '@/lib/ziina/server';

/**
 * GET /api/geo
 * Returns detected currency and formatted prices for all plans.
 * Uses Vercel's x-vercel-ip-country header for country detection.
 */
export async function GET(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country') ?? null;
  const currency: SupportedCurrency = countryToCurrency(country);

  const prices: Record<string, { amount: number; display: string; currency: string }> = {};
  for (const [planId] of Object.entries(ZIINA_PLANS)) {
    const amount = getPlanAmount(planId, currency);
    prices[planId] = {
      amount,
      display: formatAmount(amount, currency),
      currency,
    };
  }

  return NextResponse.json({ country, currency, prices });
}
