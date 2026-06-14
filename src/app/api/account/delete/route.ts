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

  // Remove personal data (PII: birth details, charts, phone live on reports).
  await db.from('reports').delete().eq('user_id', uid);
  await db.from('kundali_charts').delete().eq('user_id', uid);
  await db.from('synastry_charts').delete().eq('user_id', uid);
  await db.from('user_kundali_unlock').delete().eq('user_id', uid);
  await db.from('user_synastry_unlock').delete().eq('user_id', uid);
  await db.from('promo_redemptions').delete().eq('user_id', uid);
  await db.from('analytics_events').delete().eq('user_id', uid);
  // De-identify financial + feedback records (retained for legal/tax, no PII link).
  await db.from('ziina_payments').update({ user_id: null }).eq('user_id', uid);
  await db.from('feedback').update({ user_id: null }).eq('user_id', uid);
  if (email) await db.from('newsletter_subscribers').delete().eq('email', email);
  await db.from('user_profiles').delete().eq('id', uid);

  const { error } = await db.auth.admin.deleteUser(uid);
  if (error) {
    console.error('[account/delete] auth deleteUser:', error.message);
    return NextResponse.json({ error: 'Could not fully delete the account. Please contact support@vedichour.com.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
