import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { isBypassToken } from '@/lib/bypass';
import { getPromoDiscount, redeemPromoCode } from '@/lib/promo/server';

async function createFreeReport(
  userId: string,
  userEmail: string,
  planType: string,
  reportParams?: Record<string, unknown>
): Promise<string> {
  const supabase = createServiceClient();
  const p = reportParams ?? {};
  const name = String(p.name ?? 'Unknown');
  const birthDate = String(p.birth_date ?? p.date ?? '2000-01-01');
  const birthTime = String(p.birth_time ?? p.time ?? '12:00:00');
  const birthCity = String(p.birth_city ?? p.city ?? 'Unknown');
  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: userId,
      user_email: userEmail,
      native_name: name,
      birth_date: birthDate,
      birth_time: birthTime.includes(':') && birthTime.split(':').length === 2 ? `${birthTime}:00` : birthTime,
      birth_city: birthCity,
      birth_lat: p.birth_lat != null ? Number(p.birth_lat) : null,
      birth_lng: p.birth_lng != null ? Number(p.birth_lng) : null,
      current_city: p.current_city != null ? String(p.current_city) : null,
      plan_type: planType || '7day',
      status: 'complete',
      payment_status: 'bypass',
      report_data: { ...p, payment_bypass: true, plan_type: planType },
      generation_completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error('Failed to create report');
  return data.id as string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      bypass,
      promo_code,
      priceId,
      planType,
      reportParams,
    } = body as {
      bypass?: string;
      promo_code?: string;
      priceId?: string;
      planType?: string;
      reportParams?: Record<string, unknown>;
    };

    const plan = typeof planType === 'string' && planType ? planType : '7day';

    if (isBypassToken(bypass)) {
      const reportId = await createFreeReport(user.id, user.email, plan, reportParams);
      return NextResponse.json({
        bypass: true,
        report_id: reportId,
        redirect: `/report/${reportId}`,
      });
    }

    const promoResult = promo_code
      ? await getPromoDiscount(promo_code, user.email)
      : null;

    if (promoResult?.valid && promoResult.discountPct === 100) {
      const reportId = await createFreeReport(user.id, user.email, plan, reportParams);
      if (promoResult.codeId) {
        await redeemPromoCode(promoResult.codeId, user.id, reportId);
      }
      return NextResponse.json({
        bypass: true,
        report_id: reportId,
        redirect: `/report/${reportId}`,
      });
    }

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.startsWith('your_')) {
      return NextResponse.json(
        { error: 'Stripe not configured', testMode: true },
        { status: 200 }
      );
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    const discount = promoResult?.valid ? promoResult.discountPct : 0;

    const session = await createCheckoutSession({
      priceId,
      userId: user.id,
      userEmail: user.email,
      planType: typeof planType === 'string' ? planType : undefined,
      promoPercent: discount > 0 && discount < 100 ? discount : undefined,
      promoCode:
        discount > 0 && discount < 100
          ? promo_code!.trim().toUpperCase()
          : undefined,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
