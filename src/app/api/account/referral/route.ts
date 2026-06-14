export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import { referralCodeFor } from '@/lib/referral';

const SITE = 'https://www.vedichour.com';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const db = createServiceClient();
  const uid = auth.user.id;

  let code = referralCodeFor(uid);
  try {
    const { data } = await db.from('user_profiles').select('referral_code').eq('id', uid).maybeSingle();
    const existing = (data as { referral_code?: string | null } | null)?.referral_code;
    if (existing) code = existing;
    else await db.from('user_profiles').update({ referral_code: code }).eq('id', uid);
  } catch {
    /* referral_code column may not exist pre-migration — fall back to the derived code */
  }

  let count = 0;
  try {
    const { count: c } = await db.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', uid);
    count = c ?? 0;
  } catch {
    /* referrals table may not exist pre-migration */
  }

  return NextResponse.json({
    code,
    link: `${SITE}/?ref=${code}`,
    count,
  });
}
