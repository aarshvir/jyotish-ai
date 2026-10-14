export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';

/** Owner-scoped export of the account collections listed below. */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const db = createServiceClient();
  const uid = auth.user.id;

  const results = await Promise.allSettled([
    db.from('user_profiles').select('*').eq('id', uid).maybeSingle(),
    // Full Subject-Access export of the user's own report rows. Exclude ONLY
    // pipeline_state/pipeline_checkpoint — internal resumable-generation blobs that
    // hold the full paid product mid-run and are not user-facing data. Everything
    // else the user supplied or that's about them (incl. personal_context) is included.
    db.from('reports').select('id, native_name, birth_date, birth_time, birth_city, birth_lat, birth_lng, current_city, current_lat, current_lng, timezone_offset, plan_type, payment_status, payment_provider, status, lagna_sign, moon_sign, moon_nakshatra, dasha_mahadasha, dasha_antardasha, report_data, day_scores, report_start_date, report_end_date, personal_context, generation_started_at, generation_completed_at, generation_time_seconds, generation_error_code, generation_error_at_phase, generation_trace_id, generation_log, notify_sent_at, phone, upsell_dismissed_at, upsell_converted_at, user_email, created_at, updated_at').eq('user_id', uid),
    db.from('kundali_charts').select('*').eq('user_id', uid),
    db.from('synastry_charts').select('*').eq('user_id', uid),
    db.from('ziina_payments').select('id, amount, currency, plan_type, status, created_at').eq('user_id', uid),
    db.from('feedback').select('*').eq('user_id', uid),
    db.from('referrals').select('*').or(`referrer_id.eq.${uid},referee_id.eq.${uid}`),
    auth.user.email ? db.from('newsletter_subscribers').select('*').eq('email', auth.user.email) : Promise.resolve({ data: [], error: null }),
  ]);

  if (results.some(result => result.status === 'rejected' || result.value.error)) {
    return NextResponse.json({ error: 'Could not complete your account export. No account records were changed. Try again or contact support@vedichour.com.', code: 'EXPORT_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const [profile, reports, kundalis, synastries, payments, feedback, referrals, newsletter] = results.map(result => {
    if (result.status === 'rejected') throw new Error('Export unavailable');
    return result.value;
  });

  const payload = {
    exported_at: new Date().toISOString(),
    scope: 'Account profile, reports, charts, payment history, feedback, referrals and legacy newsletter records. Device drafts and separately saved quiz links are not included. Contact privacy@vedichour.com for a broader request.',
    account: { id: uid, email: auth.user.email ?? null },
    profile: profile.data ?? null,
    reports: reports.data ?? [],
    kundali_charts: kundalis.data ?? [],
    synastry_charts: synastries.data ?? [],
    payments: payments.data ?? [],
    feedback: feedback.data ?? [],
    referrals: referrals.data ?? [],
    newsletter: newsletter.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="vedichour-my-data.json"',
      'Cache-Control': 'no-store',
    },
  });
}
