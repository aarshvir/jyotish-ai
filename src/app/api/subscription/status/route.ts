export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { getSubscription, nextForecastUnlock } from '@/lib/subscriptions/access';

/**
 * The signed-in visitor's subscription state, for the quiz paywall and the dashboard:
 * the subscription itself, when their next 30-day forecast unlocks, and the birth
 * details from their latest report — so renewing or starting the next forecast never
 * asks for them again. Only ever the caller's own rows.
 *
 * Deliberately not under /api/user: that prefix is login-protected by middleware, which
 * redirects a logged-out fetch to an HTML login page — the quiz calls this before sign-up.
 */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ signedIn: false, subscription: null }, { headers });
  }

  const db = createServiceClient();
  try {
    const subscription = await getSubscription(db, data.user.id);
    const [lastForecast, latest] = await Promise.all([
      db
        .from('reports')
        .select('created_at')
        .eq('user_id', data.user.id)
        .in('payment_status', ['paid', 'promo'])
        .in('plan_type', ['monthly', 'annual'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('reports')
        .select('native_name, birth_date, birth_time, birth_city, birth_lat, birth_lng, current_city, current_lat, current_lng, personal_context')
        .eq('user_id', data.user.id)
        .not('birth_lat', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (lastForecast.error) throw new Error(lastForecast.error.message);
    if (latest.error) throw new Error(latest.error.message);

    const lastForecastAt = (lastForecast.data as { created_at?: string } | null)?.created_at ?? null;
    const unlock = nextForecastUnlock(lastForecastAt);

    return NextResponse.json(
      {
        signedIn: true,
        subscription,
        lastForecastAt,
        nextForecastUnlock: unlock ? unlock.toISOString() : null,
        latestReport: latest.data ?? null,
      },
      { headers },
    );
  } catch (e) {
    console.warn('[subscription/status] lookup failed:', e);
    return NextResponse.json({ error: 'Could not check your subscription.' }, { status: 503, headers });
  }
}
