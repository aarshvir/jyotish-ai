export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;
  const db = createServiceClient();
  const { data, error } = await db
    .from('newsletter_subscribers')
    .select('email, source, created_at')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscribers: data ?? [] });
}
