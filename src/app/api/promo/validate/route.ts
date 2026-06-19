export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { getPromoDiscount } from '@/lib/promo/server';

/**
 * GET /api/promo/validate?code=XXX&email=YYY
 * Returns { valid, discountPct, reason? } — no code consumption.
 * Rate-limited: 10 checks per minute per IP.
 */
export async function GET(request: NextRequest) {
  const ip = getRateLimitKey(request);
  const { allowed, remaining } = await checkRateLimit(`promo:${ip}`, 10, 60_000);

  if (!allowed) {
    return NextResponse.json(
      { valid: false, discountPct: 0, reason: 'Too many requests. Try again in a minute.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } },
    );
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code') ?? '';

  // Deliberately ignore any client-supplied `email`: passing an attacker-chosen
  // email to getPromoDiscount turned this unauthenticated endpoint into an
  // allowlist-membership oracle (distinct "not available for your account" vs
  // "requires sign-in" reasons). Allowlist codes are still enforced for real at
  // redeem time against the authenticated session email. The legit onboard caller
  // never sends email, so this is a no-op for the product.
  const result = await getPromoDiscount(code);

  return NextResponse.json(result, {
    headers: { 'X-RateLimit-Remaining': String(remaining) },
  });
}
