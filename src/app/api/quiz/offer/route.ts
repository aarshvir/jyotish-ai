export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ZIINA_PLANS, countryToCurrency, formatAmount, getPlanAmount, type SupportedCurrency } from '@/lib/ziina/server';
import { blueprintSalesOpen } from '@/lib/funnel/offer';
import { commercialAvailability } from '@/lib/commercial/availability';

/**
 * GET /api/quiz/offer — what the /q funnel's offer screen (S17) may show this visitor.
 *
 * Prices come from ZIINA_PLANS, the same table checkout charges from, in the visitor's
 * currency (same precedence as /api/geo and create-intent). The blueprint is only offered
 * for sale once the server says sales are open — never a price checkout would refuse.
 */
function normalise(v: string | null | undefined): SupportedCurrency | null {
  return v === 'USD' || v === 'INR' || v === 'AED' ? v : null;
}

export async function GET(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country');
  const currency = normalise(request.cookies.get('vh_currency')?.value) ?? countryToCurrency(country);
  const availability = commercialAvailability();

  const price = (plan: string) => {
    if (!availability.checkoutEnabled) return null;
    if (!ZIINA_PLANS[plan]) return null;
    const amount = getPlanAmount(plan, currency);
    return { amount, display: formatAmount(amount, currency) };
  };
  const report = price('blueprint');
  const withBump = price('blueprint_plus30');
  const bump = report && withBump ? { amount: withBump.amount - report.amount, display: formatAmount(withBump.amount - report.amount, currency) } : null;

  return NextResponse.json({
    country: country ? country.toUpperCase() : null,
    currency,
    ...availability,
    blueprintOpen: availability.checkoutEnabled && blueprintSalesOpen() && Boolean(report && withBump),
    prices: {
      blueprint: report,
      bump,
      blueprint_plus30: withBump,
      sub_monthly: price('sub_monthly'),
      // S18 down-sell (7-day forecast) has no checkout plan yet; null hides it.
      downsell_7day: price('downsell_7day'),
    },
  });
}
