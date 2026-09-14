export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { getSubscription, latestForecastStartedAt, nextForecastUnlock } from '@/lib/subscriptions/access';
import { reconcileUserPayments } from '@/lib/ziina/reconcileUser';
import { getPaymentIntent } from '@/lib/ziina/server';
import { getCanonicalDispatchOrigin } from '@/lib/url/canonicalDispatchOrigin';

/** Keeps the quiz and dashboard responsive if Ziina is slow; finalize is idempotent, so a cut-off check just runs again next load. */
const RECONCILE_WAIT_MS = 8000;

/**
 * The signed-in visitor's subscription state, for the quiz paywall and the dashboard:
 * the subscription itself, when their next 30-day forecast unlocks, and the birth
 * details from their latest report — so renewing or starting the next forecast never
 * asks for them again. Only ever the caller's own rows.
 *
 * Deliberately not under /api/user: that prefix is login-protected by middleware, which
 * redirects a logged-out fetch to an HTML login page — the quiz calls this before sign-up.
 */
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ signedIn: false, subscription: null }, { headers });
  }

  const db = createServiceClient();

  // Grant anything this visitor paid for that never landed: a tab closed before Ziina
  // redirected, a payment that confirmed late, or a grant that failed after the claim.
  // Ziina sends this plan no webhooks, so a returning visitor is the dependable trigger.
  let grantedReportId: string | null = null;
  try {
    const reconcile = reconcileUserPayments(db, data.user.id, {
      dispatchOrigin: getCanonicalDispatchOrigin(request.nextUrl.origin),
      getPaymentIntent,
    });
    const outcome = await Promise.race([
      reconcile,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), RECONCILE_WAIT_MS)),
    ]);
    grantedReportId = outcome?.granted.find((g) => g.reportId)?.reportId ?? null;
  } catch (e) {
    console.warn('[subscription/status] payment reconcile failed:', e);
  }

  try {
    const subscription = await getSubscription(db, data.user.id);
    const [lastForecastAt, latest] = await Promise.all([
      latestForecastStartedAt(db, data.user.id),
      db
        .from('reports')
        .select('native_name, birth_date, birth_time, birth_city, birth_lat, birth_lng, current_city, current_lat, current_lng, personal_context')
        .eq('user_id', data.user.id)
        .not('birth_lat', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (latest.error) throw new Error(latest.error.message);

    const unlock = nextForecastUnlock(lastForecastAt);

    return NextResponse.json(
      {
        signedIn: true,
        subscription,
        lastForecastAt,
        nextForecastUnlock: unlock ? unlock.toISOString() : null,
        latestReport: latest.data ?? null,
        // Set when this request just granted a payment, so the quiz can take the buyer to their report.
        grantedReportId,
      },
      { headers },
    );
  } catch (e) {
    console.warn('[subscription/status] lookup failed:', e);
    return NextResponse.json({ error: 'Could not check your subscription.' }, { status: 503, headers });
  }
}
