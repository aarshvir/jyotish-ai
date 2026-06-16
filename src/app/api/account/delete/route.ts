export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * GDPR/DPDP account deletion — permanently removes the signed-in user's personal data
 * (charts, profile) and their auth account. Requires an explicit confirmation in the
 * body ({ confirm: "DELETE" }). Payments are retained for legal/tax records but
 * de-identified (user_id nulled).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Confirmation required', code: 'CONFIRM_REQUIRED' }, { status: 400 });
  }

  const db = createServiceClient();
  const uid = auth.user.id;
  const email = auth.user.email ?? '';

  // Core PII tables (birth details, charts, profile). If ANY of these fails we must
  // NOT delete the auth account — otherwise the user is told their data was erased
  // while their PII lives on, now orphaned to a deleted login. Abort + let them retry.
  const corePii: Array<[string, PromiseLike<{ error: { message: string } | null }>]> = [
    ['reports', db.from('reports').delete().eq('user_id', uid)],
    ['kundali_charts', db.from('kundali_charts').delete().eq('user_id', uid)],
    ['synastry_charts', db.from('synastry_charts').delete().eq('user_id', uid)],
    ['user_profiles', db.from('user_profiles').delete().eq('id', uid)],
  ];
  const coreFailures: string[] = [];
  for (const [table, op] of corePii) {
    const { error } = await op;
    if (error) {
      console.error(`[account/delete] core PII delete failed (${table}):`, error.message);
      coreFailures.push(table);
    }
  }
  if (coreFailures.length > 0) {
    return NextResponse.json(
      {
        error: 'Could not fully delete your data. Your account is unchanged — please try again or contact support@vedichour.com.',
        code: 'DELETE_INCOMPLETE',
      },
      { status: 500 },
    );
  }

  // Secondary cleanup + de-identification (financial/feedback retained for legal/tax,
  // PII link removed). Non-fatal: log but don't block the deletion now that core PII
  // is confirmed gone. Each is a tolerant best-effort.
  const secondary: Array<[string, PromiseLike<{ error: { message: string } | null }>]> = [
    ['user_kundali_unlock', db.from('user_kundali_unlock').delete().eq('user_id', uid)],
    ['user_synastry_unlock', db.from('user_synastry_unlock').delete().eq('user_id', uid)],
    ['promo_redemptions', db.from('promo_redemptions').delete().eq('user_id', uid)],
    ['analytics_events', db.from('analytics_events').delete().eq('user_id', uid)],
    ['ziina_payments', db.from('ziina_payments').update({ user_id: null }).eq('user_id', uid)],
    ['feedback', db.from('feedback').update({ user_id: null, email: null }).eq('user_id', uid)],
  ];
  if (email) {
    secondary.push(['newsletter_subscribers', db.from('newsletter_subscribers').delete().eq('email', email)]);
    secondary.push(['promo_usage', db.from('promo_usage').delete().eq('user_email', email)]);
  }
  for (const [table, op] of secondary) {
    const { error } = await op;
    if (error) console.warn(`[account/delete] secondary cleanup failed (${table}):`, error.message);
  }

  const { error } = await db.auth.admin.deleteUser(uid);
  if (error) {
    console.error('[account/delete] auth deleteUser:', error.message);
    return NextResponse.json({ error: 'Could not fully delete the account. Please contact support@vedichour.com.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
