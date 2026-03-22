import { createClient } from '@/lib/supabase/server';
import { TERMS_VERSION } from '@/lib/legal/termsVersion';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ua = req.headers.get('user-agent') ?? null;
  const forwarded = req.headers.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;

  const { error } = await supabase.from('user_consent').insert({
    user_id: user.id,
    user_email: user.email,
    terms_version: TERMS_VERSION,
    privacy_version: TERMS_VERSION,
    refund_version: TERMS_VERSION,
    explicitly_checked: true,
    user_agent: ua,
    ip_address: ip,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
