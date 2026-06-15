export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import {
  createPaymentIntent,
  countryToCurrency,
  getPaymentIntent,
  computeIntentAmount,
  isZiinaConfigured,
  type SupportedCurrency,
} from '@/lib/ziina/server';
import { getPromoDiscount, redeemPromoCode, hasUserRedeemed } from '@/lib/promo/server';
import { getReusablePendingZiinaIntent } from '@/lib/ziina/pendingIntentReuse';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * POST /api/ziina/create-intent
 * Body: { planType: '7day' | 'monthly' | 'annual', reportId: string }
 * Returns: { intentId, redirectUrl, currency, amount }
 *
 * Country detected from x-vercel-ip-country header → currency selected automatically.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!isZiinaConfigured()) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as {
    planType?: string;
    reportId?: string;
    promoCode?: string;
    testMode?: boolean;
    currency?: string;
    // Birth fields — persisted as a draft report row BEFORE checkout so a completed
    // payment always has a row to mark paid + generate.
    name?: string;
    phone?: string;
    birth_date?: string;
    birth_time?: string;
    birth_city?: string;
    birth_lat?: number | string;
    birth_lng?: number | string;
    current_city?: string;
    current_lat?: number | string;
    current_lng?: number | string;
    timezone_offset?: number | string;
    forecast_start?: string;
  };

  const { planType, reportId, promoCode, testMode } = body;
  if (!planType) {
    return NextResponse.json({ error: 'planType required' }, { status: 400 });
  }
  const isStandaloneUnlock = (planType === 'synastry' || planType === 'kundali') && !reportId;
  if (!reportId && !isStandaloneUnlock) {
    return NextResponse.json({ error: 'reportId required for this plan' }, { status: 400 });
  }

  const promoResult: { valid: boolean; discountPct: number; codeId?: string; oncePerUser?: boolean; reason?: string } = promoCode
    ? await getPromoDiscount(promoCode, auth.user.email ?? undefined)
    : { valid: false, discountPct: 0 };

  // If a code was entered but rejected, tell the buyer rather than silently charging full price.
  if (promoCode && !promoResult.valid) {
    return NextResponse.json({ error: promoResult.reason ?? 'Invalid coupon code' }, { status: 400 });
  }

  const discountPct = promoResult.valid ? promoResult.discountPct : 0;

  // Once-per-user enforcement: every code is single-use per account except those
  // flagged unlimited (e.g. ADMIN100). Checked against recorded redemptions.
  if (promoResult.valid && promoResult.oncePerUser && promoResult.codeId) {
    if (await hasUserRedeemed(promoResult.codeId, auth.user.id)) {
      return NextResponse.json({ error: 'You have already used this coupon.' }, { status: 400 });
    }
  }

  // Forecast: a 100% code is handled by the onboard flow (free generation), not here.
  if (!isStandaloneUnlock && discountPct >= 100) {
    return NextResponse.json({ error: 'Use a valid promo code — this report is free' }, { status: 400 });
  }

  // Standalone (Kundali / Matchmaking) + 100% code: grant the unlock directly and skip
  // Ziina (a zero-amount intent is invalid). Mirrors finalizeIntent's standalone grant.
  if (isStandaloneUnlock && discountPct >= 100) {
    // 100%-off codes (e.g. ADMIN100) grant a direct unlock to anyone who enters them,
    // by owner's explicit choice. Manage/disable in /admin → Coupons.
    const dbFree = createServiceClient();
    const unlockTable = planType === 'kundali' ? 'user_kundali_unlock' : 'user_synastry_unlock';
    const { error: unlockErr } = await dbFree.from(unlockTable).upsert(
      { user_id: auth.user.id, unlocked_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
    if (unlockErr) {
      console.error('[ziina/create-intent] free-unlock upsert failed:', unlockErr.message);
      return NextResponse.json({ error: 'Could not apply your code. Please try again.' }, { status: 500 });
    }
    if (promoResult.codeId) {
      try {
        await redeemPromoCode(promoResult.codeId, auth.user.id);
      } catch (e) {
        console.warn('[ziina/create-intent] promo redeem failed (non-fatal):', e);
      }
    }
    return NextResponse.json({ redirectUrl: `/${planType}?unlocked=1`, freeUnlock: true, discountPct: 100 });
  }

  // Currency precedence (most-specific wins):
  //   1. Explicit body override (`body.currency`) — used by the manual switcher when
  //      the client wants to pin a non-geo currency for checkout.
  //   2. Cookie `vh_currency` set by <CurrencySwitcher /> on landing/dashboard.
  //   3. Geo-detected currency from `x-vercel-ip-country` (legacy default).
  function readCookie(name: string): string | null {
    const raw = request.headers.get('cookie');
    if (!raw) return null;
    for (const part of raw.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      const k = part.slice(0, eq).trim();
      if (k === name) return decodeURIComponent(part.slice(eq + 1).trim());
    }
    return null;
  }
  function normaliseCurrency(v: string | null): SupportedCurrency | null {
    if (v === 'USD' || v === 'INR' || v === 'AED') return v;
    return null;
  }

  const bodyCurrencyRaw =
    (body as { currency?: unknown }).currency &&
    typeof (body as { currency?: unknown }).currency === 'string'
      ? ((body as { currency?: string }).currency as string)
      : null;
  const cookieCurrency = normaliseCurrency(readCookie('vh_currency'));
  const country = request.headers.get('x-vercel-ip-country') ?? null;
  const currency: SupportedCurrency =
    normaliseCurrency(bodyCurrencyRaw) ?? cookieCurrency ?? countryToCurrency(country);

  const origin = request.nextUrl.origin;
  const verifyBase = `${origin}/api/ziina/verify?intentId={PAYMENT_INTENT_ID}&planType=${planType}&status=`;
  const successUrl = isStandaloneUnlock
    ? `${verifyBase}success`
    : `${verifyBase}success&reportId=${reportId}`;
  const cancelUrl = isStandaloneUnlock
    ? `${verifyBase}cancel`
    : `${verifyBase}cancel&reportId=${reportId}`;
  const failureUrl = isStandaloneUnlock
    ? `${verifyBase}failure`
    : `${verifyBase}failure&reportId=${reportId}`;

  const db = createServiceClient();
  const productionRuntime =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    (process.env.VERCEL === '1' && process.env.NODE_ENV !== 'development');
  const allowTestMode = testMode === true && !productionRuntime;

  try {
    if (reportId && !isStandaloneUnlock) {
      const { data: reportRow, error: reportErr } = await db
        .from('reports')
        .select('user_id')
        .eq('id', reportId)
        .maybeSingle();

      if (reportErr) {
        return NextResponse.json({ error: reportErr.message }, { status: 500 });
      }
      if (reportRow && reportRow.user_id !== auth.user.id) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      const pendingCutoff = new Date(Date.now() - 90 * 1000).toISOString();
      const { data: existingPayment, error: existingPaymentErr } = await db
        .from('ziina_payments')
        .select('ziina_intent_id')
        .eq('user_id', auth.user.id)
        .eq('report_id', reportId)
        .eq('plan_type', planType)
        .eq('status', 'pending')
        .gte('created_at', pendingCutoff)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPaymentErr) {
        console.warn(
          '[ziina/create-intent] pending intent lookup failed (continuing with new intent):',
          existingPaymentErr.message,
        );
      } else if (existingPayment?.ziina_intent_id) {
        const existingIntent = await getPaymentIntent(existingPayment.ziina_intent_id);
        // Only reuse the recent pending intent if it still matches the buyer's current
        // currency + amount (and is still awaiting payment). If they switched currency or
        // applied/changed a promo since, fall through and create a FRESH intent so they
        // aren't redirected to a stale intent with the wrong amount.
        const expectedAmount = computeIntentAmount(planType, currency, discountPct);
        const reusable = getReusablePendingZiinaIntent(existingIntent, { currency, expectedAmount });
        if (reusable) {
          return NextResponse.json({
            intentId: reusable.id,
            redirectUrl: reusable.redirect_url,
            currency,
            amount: reusable.amount,
            discountPct,
          });
        }
      }
    }

    // Persist a paid report DRAFT row (with full birth data) BEFORE checkout so a
    // completed Ziina payment ALWAYS has a row to mark paid + generate. Without this,
    // verify redirects to a bare /report/{id} with no row → the buyer sees "not found"
    // after paying. Created 'pending'/'unpaid'; finalize flips it to paid + dispatches
    // generation from these stored birth fields. ignoreDuplicates so it never clobbers
    // an already-owned (e.g. already-paid) row.
    if (reportId && !isStandaloneUnlock) {
      const toCoord = (v: unknown): number | null => {
        const n = parseFloat(String(v ?? ''));
        return Number.isFinite(n) ? n : null;
      };
      const { error: draftErr } = await db.from('reports').upsert(
        {
          id: reportId,
          user_id: auth.user.id,
          user_email: auth.user.email ?? '',
          native_name: body.name ?? 'Seeker',
          birth_date: body.birth_date ?? '2000-01-01',
          birth_time: body.birth_time ?? '12:00:00',
          birth_city: body.birth_city ?? 'Unknown',
          birth_lat: toCoord(body.birth_lat),
          birth_lng: toCoord(body.birth_lng),
          current_city: body.current_city ?? null,
          current_lat: toCoord(body.current_lat),
          current_lng: toCoord(body.current_lng),
          timezone_offset:
            typeof body.timezone_offset === 'number'
              ? body.timezone_offset
              : parseInt(String(body.timezone_offset ?? '0'), 10) || 0,
          plan_type: planType,
          // Persist the buyer's chosen forecast start date so the post-payment
          // auto-dispatch (finalizeIntent) generates from it instead of defaulting to today.
          report_start_date:
            typeof body.forecast_start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.forecast_start)
              ? body.forecast_start
              : null,
          status: 'pending',
          payment_status: 'unpaid',
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
      if (draftErr) {
        console.error('[ziina/create-intent] draft report upsert failed:', draftErr.message);
      }

      // Optional column: phone (migration 20260614_user_phone). Tolerant of older DBs;
      // lets the owner call the seeker to discuss their reading.
      if (typeof body.phone === 'string' && body.phone.trim()) {
        const { error: phoneErr } = await db
          .from('reports')
          .update({ phone: body.phone.trim() })
          .eq('id', reportId)
          .eq('user_id', auth.user.id);
        if (phoneErr) {
          const m = phoneErr.message ?? '';
          if (!m.includes('phone') && !m.includes('schema cache')) {
            console.warn('[ziina/create-intent] phone update failed:', m);
          }
        }
      }
    }

    const intent = await createPaymentIntent({
      planType,
      currency,
      reportId: reportId ?? 'synastry-standalone',
      successUrl,
      cancelUrl,
      failureUrl,
      discountPct: discountPct > 0 ? discountPct : undefined,
      test: allowTestMode,
    });

    // Store intentId -> reportId binding server-side so verification never
    // trusts redirect URL parameters for payment/report ownership.
    const { error: dbErr } = await db.from('ziina_payments').insert({
      ziina_intent_id: intent.id,
      report_id: isStandaloneUnlock ? null : reportId,
      user_id: auth.user.id,
      amount: intent.amount,
      currency: currency,
      plan_type: planType,
      status: 'pending',
      promo_code_id: promoResult.codeId ?? null,
    });
    if (dbErr) {
      console.error('[ziina/create-intent] ziina_payments insert failed:', dbErr.message);
      return NextResponse.json({ error: 'Failed to bind payment intent' }, { status: 500 });
    }

    return NextResponse.json({
      intentId: intent.id,
      redirectUrl: intent.redirect_url,
      currency,
      amount: intent.amount,
      discountPct,
    });
  } catch (err) {
    console.error('[ziina/create-intent]', err);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}
