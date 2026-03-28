export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';

/**
 * Creates a `reports` row in `generating` state. Client then opens `/report/[id]?...`
 * to run the pipeline (Phase 2 will move execution here + SSE).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const reportId = typeof body.reportId === 'string' ? body.reportId : null;
  if (!reportId) {
    return NextResponse.json({ error: 'reportId required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from('reports').insert({
    id: reportId,
    user_id: auth.user.id,
    user_email: auth.user.email ?? '',
    native_name: body.name ?? 'Unknown',
    birth_date: body.birth_date ?? '2000-01-01',
    birth_time: body.birth_time ?? '12:00:00',
    birth_city: body.birth_city ?? 'Unknown',
    birth_lat: body.birth_lat ?? null,
    birth_lng: body.birth_lng ?? null,
    current_city: body.current_city ?? null,
    current_lat: body.current_lat ?? null,
    current_lng: body.current_lng ?? null,
    timezone_offset: body.timezone_offset ?? null,
    plan_type: body.plan_type ?? '7day',
    status: 'generating',
    payment_status: body.payment_status ?? 'free',
  });

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reportId, ok: true });
}
