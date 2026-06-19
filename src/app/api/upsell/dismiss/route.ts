export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import { emitUpsellEvent } from '@/lib/analytics/upsellEvents';

/** POST /api/upsell/dismiss — body: { reportId } */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({})) as { reportId?: string };
  const reportId = body.reportId?.trim();
  if (!reportId) {
    return NextResponse.json({ error: 'reportId required' }, { status: 400 });
  }

  const db = createServiceClient();
  const { error } = await db
    .from('reports')
    .update({ upsell_dismissed_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('user_id', auth.user.id);

  if (error) {
    console.error('[upsell/dismiss]', error.message);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  await emitUpsellEvent(auth.user.id, 'upsell_dismissed', { reportId });

  return NextResponse.json({ ok: true });
}
