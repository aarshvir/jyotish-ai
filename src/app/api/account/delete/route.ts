export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * Owner-scoped account deletion — removes the signed-in user's account-linked data
 * (charts, profile) and their auth account. Requires an explicit confirmation in the
 * body ({ confirm: "DELETE" }). Payments are retained for legal/tax records but
 * de-identified (user_id nulled).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (body?.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Confirmation required', code: 'CONFIRM_REQUIRED' }, { status: 400 });
  }

  const db = createServiceClient();
  const uid = auth.user.id;
  const email = auth.user.email ?? '';

  // Core PII tables (birth details, charts, profile). If ANY of these fails we must
  // NOT delete the auth account — otherwise the user is told their data was erased
  // while their PII lives on, now orphaned to a deleted login. Abort + let them retry.
  const corePii: Array<[string, string]> = [
    ['reports', 'user_id'], ['kundali_charts', 'user_id'],
    ['synastry_charts', 'user_id'], ['user_profiles', 'id'],
  ];
  function incomplete(closureUnknown = false) {
    return NextResponse.json(
      {
        error: closureUnknown
          ? 'Your account-linked data was removed, but sign-in closure could not be confirmed. Check account access or contact support@vedichour.com.'
          : 'Deletion is incomplete. Some records may already have been removed, but this request has not deleted your sign-in. Retry to finish, or contact support@vedichour.com.',
        code: 'DELETE_INCOMPLETE',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  for (const [table, column] of corePii) {
    try {
      const { error } = await db.from(table).delete().eq(column, uid);
      if (error) return incomplete();
    } catch { return incomplete(); }
  }

  // Verify cleanup before removing sign-in, including de-identification of retained records.
  const secondary: Array<() => PromiseLike<{ error: { message: string } | null }>> = [
    () => db.from('user_kundali_unlock').delete().eq('user_id', uid),
    () => db.from('user_synastry_unlock').delete().eq('user_id', uid),
    // Keep promo_redemptions (user_id SET NULL via FK on auth delete) so once-per-user
    // order_id rows remain as an audit trail. Deleting them let the same person
    // re-signup and re-redeem once_per_user codes. used_count is never decremented.
    () => db.from('analytics_events').delete().eq('user_id', uid),
    () => db.from('ziina_payments').update({ user_id: null }).eq('user_id', uid),
    () => db.from('feedback').update({ user_id: null, email: null }).eq('user_id', uid),
  ];
  if (email) {
    secondary.push(() => db.from('newsletter_subscribers').delete().eq('email', email));
    secondary.push(() => db.from('promo_usage').delete().eq('user_email', email));
  }
  for (const operation of secondary) {
    try { if ((await operation()).error) return incomplete(); }
    catch { return incomplete(); }
  }

  try { if ((await db.auth.admin.deleteUser(uid)).error) return incomplete(true); }
  catch { return incomplete(true); }
  return NextResponse.json({ ok: true, scope: 'Account-linked profile, reports and charts. Device drafts and separately saved quiz links are not included.' }, { headers: { 'Cache-Control': 'no-store' } });
}
