export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;
  const db = createServiceClient();
  const { data, error } = await db.from('admin_users').select('email, added_at').order('added_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data ?? [], you: admin.email });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  const db = createServiceClient();
  const { error } = await db.from('admin_users').upsert({ email }, { onConflict: 'email' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
  if (email === admin.email.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot remove your own admin access.' }, { status: 400 });
  }
  const db = createServiceClient();
  const { error } = await db.from('admin_users').delete().eq('email', email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
