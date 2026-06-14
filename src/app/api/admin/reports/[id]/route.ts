export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * Admin-only: fetch any user's full report row (including report_data).
 */
export async function GET(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const reportId = context.params.id?.trim();
  if (!reportId) {
    return NextResponse.json({ error: 'Missing report id' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data, error } = await db.from('reports').select('*').eq('id', reportId).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  return NextResponse.json({ report: data });
}
