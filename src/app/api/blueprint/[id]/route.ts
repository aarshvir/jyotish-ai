export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import { isEntitledPaymentStatus } from '@/lib/reports/entitlement';
import { dispatchBlueprintGenerate, isBlueprintDoc, isBlueprintPlan } from '@/lib/blueprint/deliver';

/**
 * GET  /api/blueprint/{reportId}  the Karmic Blueprint for the signed-in owner (or an admin).
 * POST /api/blueprint/{reportId}  ask for it to be (re)built — only for a paid row that has no finished document.
 *
 * Answers `{ isBlueprint: false }` for any report that is not a Blueprint, so the report page can
 * ask this first and fall back to the forecast view. A report that is not the caller's looks the
 * same as one that does not exist.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NO_STORE = { 'Cache-Control': 'no-store' };

async function loadOwned(request: NextRequest, id: string) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return { res: auth } as const;
  if (!UUID.test(id)) return { res: NextResponse.json({ isBlueprint: false }, { status: 404, headers: NO_STORE }) } as const;
  const db = createServiceClient();
  const { data } = await db
    .from('reports')
    .select('user_id, plan_type, payment_status, status, report_data, native_name')
    .eq('id', id)
    .maybeSingle();
  const row = data as { user_id: string; plan_type: string | null; payment_status: string | null; status: string | null; report_data: unknown; native_name: string | null } | null;
  if (!row || (row.user_id !== auth.user.id && auth.isAdmin !== true)) {
    return { res: NextResponse.json({ isBlueprint: false }, { status: 404, headers: NO_STORE }) } as const;
  }
  return { db, row, auth } as const;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const r = await loadOwned(request, params.id);
  if ('res' in r) return r.res;
  const { row, auth } = r;
  if (!isBlueprintPlan(row.plan_type)) return NextResponse.json({ isBlueprint: false }, { headers: NO_STORE });

  const entitled = auth.isAdmin === true || isEntitledPaymentStatus(row.payment_status);
  if (!entitled) return NextResponse.json({ isBlueprint: true, status: 'unpaid', doc: null }, { headers: NO_STORE });

  if (row.status === 'complete' && isBlueprintDoc(row.report_data)) {
    return NextResponse.json({ isBlueprint: true, status: 'complete', doc: row.report_data }, { headers: NO_STORE });
  }
  const failed = row.status === 'error';
  return NextResponse.json(
    { isBlueprint: true, status: failed ? 'error' : row.status === 'generating' ? 'generating' : 'pending', doc: null },
    { headers: NO_STORE },
  );
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const r = await loadOwned(request, params.id);
  if ('res' in r) return r.res;
  const { db, row, auth } = r;
  if (!isBlueprintPlan(row.plan_type)) return NextResponse.json({ isBlueprint: false }, { status: 400, headers: NO_STORE });
  if (!(auth.isAdmin === true || isEntitledPaymentStatus(row.payment_status))) {
    return NextResponse.json({ error: 'This report is not paid.' }, { status: 402, headers: NO_STORE });
  }
  const result = await dispatchBlueprintGenerate(db, params.id);
  return NextResponse.json({ ok: result !== 'unavailable', result }, { status: result === 'unavailable' ? 503 : 202, headers: NO_STORE });
}
