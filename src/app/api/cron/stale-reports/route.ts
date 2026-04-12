import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Marks very old `generating` rows as `error` (orphaned after platform kill / hung LLM).
 * Secured with CRON_SECRET — set in Vercel project env and in Supabase if calling manually.
 * Vercel Cron sends: Authorization: Bearer <CRON_SECRET> when CRON_SECRET is configured.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceClient();
  const cutoff = new Date(Date.now() - 25 * 60 * 1000).toISOString();

  const { data: byStart, error: e1 } = await db
    .from('reports')
    .select('id')
    .eq('status', 'generating')
    .lt('generation_started_at', cutoff);

  if (e1) {
    console.error('[cron/stale-reports] select:', e1.message);
    return NextResponse.json({ error: e1.message }, { status: 500 });
  }

  const { data: byCreated, error: e2 } = await db
    .from('reports')
    .select('id')
    .eq('status', 'generating')
    .is('generation_started_at', null)
    .lt('created_at', cutoff);

  if (e2) {
    console.error('[cron/stale-reports] select null-start:', e2.message);
    return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  const idSet = new Set<string>();
  for (const r of byStart ?? []) idSet.add(r.id);
  for (const r of byCreated ?? []) idSet.add(r.id);
  const ids = Array.from(idSet);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, marked: 0, ids: [] });
  }

  const now = new Date().toISOString();
  const { error: upErr } = await db
    .from('reports')
    .update({ status: 'error', updated_at: now })
    .in('id', ids)
    .eq('status', 'generating');

  if (upErr) {
    console.error('[cron/stale-reports] update:', upErr.message);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  console.warn(`[cron/stale-reports] marked ${ids.length} stale generating rows as error`);
  return NextResponse.json({ ok: true, marked: ids.length, ids });
}
