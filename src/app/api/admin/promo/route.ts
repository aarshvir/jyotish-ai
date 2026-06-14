export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

const COLS = 'id, code, discount_pct, max_uses, used_count, allowlist_emails, active, expires_at';

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;
  const db = createServiceClient();
  const { data, error } = await db.from('promo_codes').select(COLS).order('code');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ codes: data ?? [] });
}

/** Create or update a coupon. */
export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    discount_pct?: number;
    max_uses?: number | null;
    allowlist_emails?: string[] | null;
    expires_at?: string | null;
  };
  const code = (body.code ?? '').trim().toUpperCase();
  const pct = Number(body.discount_pct);
  if (!code || !/^[A-Z0-9]+$/.test(code)) {
    return NextResponse.json({ error: 'Code must be letters/numbers only' }, { status: 400 });
  }
  if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
    return NextResponse.json({ error: 'discount_pct must be 1-100' }, { status: 400 });
  }

  const allowlist = Array.isArray(body.allowlist_emails) && body.allowlist_emails.length
    ? body.allowlist_emails.map((e) => e.trim().toLowerCase()).filter(Boolean)
    : null;

  const db = createServiceClient();
  const { error } = await db.from('promo_codes').upsert(
    {
      code,
      discount_pct: pct,
      max_uses: body.max_uses ?? null,
      allowlist_emails: allowlist,
      active: true,
      expires_at: body.expires_at ?? null,
    },
    { onConflict: 'code' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Enable / disable a coupon. */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const body = (await request.json().catch(() => ({}))) as { code?: string; active?: boolean };
  const code = (body.code ?? '').trim().toUpperCase();
  if (!code || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'code and active (boolean) required' }, { status: 400 });
  }
  const db = createServiceClient();
  const { error } = await db.from('promo_codes').update({ active: body.active }).eq('code', code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
