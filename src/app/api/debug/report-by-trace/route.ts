/**
 * Admin: look up report rows by `generation_trace_id` (correlation ID from /reports/start).
 * Requires signed-in user whose email is in ADMIN_EMAILS.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/bypass';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const trace =
    request.nextUrl.searchParams.get('trace') ??
    request.nextUrl.searchParams.get('generation_trace_id') ??
    '';
  const trimmed = trace.trim();
  if (!trimmed || !UUID_RE.test(trimmed)) {
    return NextResponse.json(
      { error: 'Invalid or missing trace (expected UUID in ?trace= or ?generation_trace_id=)' },
      { status: 400 },
    );
  }

  const db = createServiceClient();
  const { data: rows, error } = await db
    .from('reports')
    .select(
      [
        'id',
        'user_id',
        'user_email',
        'status',
        'generation_step',
        'generation_progress',
        'generation_trace_id',
        'generation_started_at',
        'generation_completed_at',
        'generation_error_code',
        'generation_error_at_phase',
        'updated_at',
        'created_at',
        'native_name',
        'plan_type',
      ].join(', '),
    )
    .eq('generation_trace_id', trimmed)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    generation_trace_id: trimmed,
    count: rows?.length ?? 0,
    reports: rows ?? [],
  });
}
