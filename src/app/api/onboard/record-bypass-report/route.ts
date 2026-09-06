import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { isBypassToken } from '@/lib/bypass';

export const dynamic = 'force-dynamic';

/**
 * Optional: record a paid-status report row when an authenticated user completes
 * onboard with a valid bypass token (admin URL).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const bypass = typeof body?.bypass === 'string' ? body.bypass : '';
    if (!isBypassToken(bypass)) {
      return NextResponse.json({ error: 'Invalid bypass' }, { status: 403 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ skipped: true, reason: 'not_authenticated' });
    }

    const planType =
      typeof body?.plan_type === 'string' && body.plan_type
        ? body.plan_type
        : '7day';

    const birthTime =
      typeof body?.birth_time === 'string' && body.birth_time
        ? body.birth_time.includes(':') && body.birth_time.split(':').length === 2
          ? `${body.birth_time}:00`
          : body.birth_time
        : '12:00:00';

    // Service role: 'bypass' is an entitled grant and RLS forbids browser writes of it.
    const db = createServiceClient();
    const { data, error } = await db
      .from('reports')
      .insert({
        user_id: user.id,
        user_email: user.email ?? '',
        native_name: typeof body?.name === 'string' ? body.name : 'Unknown',
        birth_date: typeof body?.birth_date === 'string' ? body.birth_date : '2000-01-01',
        birth_time: birthTime,
        birth_city: typeof body?.birth_city === 'string' ? body.birth_city : 'Unknown',
        plan_type: planType,
        status: 'complete',
        payment_status: 'bypass',
        report_data: {
          source: 'onboard_bypass',
          plan_type: planType,
          name: body?.name,
          birth_date: body?.birth_date,
          birth_time: body?.birth_time,
          birth_city: body?.birth_city,
        },
        generation_completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('record-bypass-report insert:', error);
      return NextResponse.json({ error: 'Could not record report' }, { status: 500 });
    }

    // Optional column: phone (migration 20260614_user_phone). Non-fatal on older DBs.
    if (typeof body?.phone === 'string' && body.phone.trim() && data?.id) {
      const { error: phoneErr } = await db
        .from('reports')
        .update({ phone: body.phone.trim() })
        .eq('id', data.id);
      if (phoneErr) console.warn('record-bypass-report phone update:', phoneErr.message);
    }

    return NextResponse.json({ id: data?.id });
  } catch (e) {
    console.error('record-bypass-report:', e);
    return NextResponse.json({ error: 'Failed to record report' }, { status: 500 });
  }
}
