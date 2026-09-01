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

  // Delete/de-identify all app data in one database transaction. If any core table
  // fails, Postgres rolls everything back and the auth account is left untouched.
  const { error: dataDeleteError } = await db.rpc('delete_account_data', {
    p_user_id: uid,
    p_email: email || null,
  });
  if (dataDeleteError) {
    console.error('[account/delete] delete_account_data:', dataDeleteError.message);
    return NextResponse.json(
      {
        error: 'Could not fully delete your data. Your account is unchanged — please try again or contact support@vedichour.com.',
        code: 'DELETE_INCOMPLETE',
      },
      { status: 500 },
    );
  }

  const { error } = await db.auth.admin.deleteUser(uid);
  if (error) {
    console.error('[account/delete] auth deleteUser:', error.message);
    return NextResponse.json(
      { error: 'Your personal data was removed, but the login could not be deleted. Please contact support@vedichour.com.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
