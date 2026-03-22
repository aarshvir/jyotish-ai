import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    const { data, error } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        report_type: planType,
        status: 'paid',
        output_json: {
          source: 'onboard_bypass',
          plan_type: planType,
          name: body?.name,
          birth_date: body?.birth_date,
          birth_time: body?.birth_time,
          birth_city: body?.birth_city,
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('record-bypass-report insert:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data?.id });
  } catch (e) {
    console.error('record-bypass-report:', e);
    return NextResponse.json({ error: 'Failed to record report' }, { status: 500 });
  }
}
