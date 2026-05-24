export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import {
  createPaymentIntent,
  countryToCurrency,
  getPaymentIntent,
  isZiinaConfigured,
  type SupportedCurrency,
} from '@/lib/ziina/server';
import { getPromoDiscount } from '@/lib/promo/server';
import { createServiceClient } from '@/lib/supabase/admin';

function toFiniteNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normaliseBirthTime(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '12:00:00';
  return raw.includes(':') && raw.split(':').length === 2 ? `${raw}:00` : raw;
}

/**
 * POST /api/ziina/create-intent
 * Body: { planType: '7day' | 'monthly' | 'annual', reportId: string, ...birthData }
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
    name?: string;
    birth_date?: string;
    birth_time?: string;
    birth_city?: string;
    birth_lat?: string | number | null;
    birth_lng?: string | number | null;
    current_city?: string | null;
    current_lat?: string | number | null;
    current_lng?: string | number | null;
    timezone_offset?: string | number | null;
    forecast_start?: string;
    currency?: string;
  };

  const { planType, reportId, promoCode, testMode } = body;
  if (!planType) {
    return NextResponse.json({ error: 'planType required' }, { status: 400 });
  }
  const isSynastryStandalone = planType === 'synastry' && !reportId;
  if (!reportId && !isSynastryStandalone) {
    return NextResponse.json({ error: 'reportId required for this plan' }, { status: 400 });
  }

  const promoResult =
    !isSynastryStandalone && promoCode
      ? await getPromoDiscount(promoCode, auth.user.email ?? undefined)
      : { valid: false, discountPct: 0 };

  const discountPct = promoResult.valid ? promoResult.discountPct : 0;

  if (!isSynastryStandalone && discountPct >= 100) {
    return NextResponse.json({ error: 'Use a valid promo code — this report is free' }, { status: 400 });
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
  const successUrl = isSynastryStandalone
    ? `${verifyBase}success`
    : `${verifyBase}success&reportId=${reportId}`;
  const cancelUrl = isSynastryStandalone
    ? `${verifyBase}cancel`
    : `${verifyBase}cancel&reportId=${reportId}`;
  const failureUrl = isSynastryStandalone
    ? `${verifyBase}failure`
    : `${verifyBase}failure&reportId=${reportId}`;

  const db = createServiceClient();
  const productionRuntime =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    (process.env.VERCEL === '1' && process.env.NODE_ENV !== 'development');
  const allowTestMode = testMode === true && !productionRuntime;

  try {
    if (reportId && !isSynastryStandalone) {
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
      if (!reportRow) {
        const hasRequiredBirthData =
          typeof body.name === 'string' &&
          body.name.trim() !== '' &&
          typeof body.birth_date === 'string' &&
          body.birth_date.trim() !== '' &&
          typeof body.birth_time === 'string' &&
          body.birth_time.trim() !== '' &&
          typeof body.birth_city === 'string' &&
          body.birth_city.trim() !== '' &&
          toFiniteNumber(body.birth_lat) != null &&
          toFiniteNumber(body.birth_lng) != null;

        if (!hasRequiredBirthData) {
          return NextResponse.json(
            { error: 'birth data required before checkout' },
            { status: 400 },
          );
        }

        const nowIso = new Date().toISOString();
        const { error: draftErr } = await db.from('reports').insert({
          id: reportId,
          user_id: auth.user.id,
          user_email: auth.user.email ?? '',
          native_name: body.name!.trim(),
          birth_date: body.birth_date!.trim(),
          birth_time: normaliseBirthTime(body.birth_time),
          birth_city: body.birth_city!.trim(),
          birth_lat: toFiniteNumber(body.birth_lat),
          birth_lng: toFiniteNumber(body.birth_lng),
          current_city:
            typeof body.current_city === 'string' && body.current_city.trim() !== ''
              ? body.current_city.trim()
              : null,
          current_lat: toFiniteNumber(body.current_lat),
          current_lng: toFiniteNumber(body.current_lng),
          timezone_offset: toFiniteNumber(body.timezone_offset) ?? 0,
          plan_type: planType,
          status: 'pending_payment',
          payment_status: 'unpaid',
          payment_provider: null,
          updated_at: nowIso,
        });

        if (draftErr) {
          console.error('[ziina/create-intent] report draft insert failed:', draftErr.message);
          return NextResponse.json({ error: 'Failed to prepare report for checkout' }, { status: 500 });
        }
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
        return NextResponse.json({
          intentId: existingIntent.id,
          redirectUrl: existingIntent.redirect_url,
          currency,
          amount: existingIntent.amount,
          discountPct,
        });
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
      report_id: isSynastryStandalone ? null : reportId,
      user_id: auth.user.id,
      amount: intent.amount,
      currency: currency,
      plan_type: planType,
      status: 'pending',
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
