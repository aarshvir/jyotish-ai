export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';

/** GDPR/DPDP data export — returns all of the signed-in user's data as a JSON download. */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const db = createServiceClient();
  const uid = auth.user.id;

  const [profile, reports, kundalis, synastries, payments] = await Promise.all([
    db.from('user_profiles').select('*').eq('id', uid).maybeSingle(),
    db.from('reports').select('*').eq('user_id', uid),
    db.from('kundali_charts').select('*').eq('user_id', uid),
    db.from('synastry_charts').select('*').eq('user_id', uid),
    db.from('ziina_payments').select('id, amount, currency, plan_type, status, created_at').eq('user_id', uid),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: uid, email: auth.user.email ?? null },
    profile: profile.data ?? null,
    reports: reports.data ?? [],
    kundali_charts: kundalis.data ?? [],
    synastry_charts: synastries.data ?? [],
    payments: payments.data ?? [],
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
