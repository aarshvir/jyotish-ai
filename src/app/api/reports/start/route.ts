/** Vercel cap for non-Enterprise plans is 300s; keep in sync with `vercel.json`. */
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';

/** If a row is `generating` and younger than this, skip starting a duplicate pipeline. */
const YOUNG_GENERATING_MS = 12 * 60 * 1000;

function isYoungGenerating(generationStartedAt: string | null | undefined): boolean {
  if (!generationStartedAt) return false;
  const t = new Date(generationStartedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < YOUNG_GENERATING_MS;
}

/**
 * Creates or updates a `reports` row in `generating` state. The client must then POST
 * `/api/reports/run` (same session) so the pipeline runs in a **separate** invocation —
 * on Next 14 App Router, `@vercel/functions` `waitUntil` can be a no-op when the platform
 * request context is missing, which would kill work as soon as this handler returns 202.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const reportId = typeof body.reportId === 'string' ? body.reportId : null;
  if (!reportId) {
    return NextResponse.json({ error: 'reportId required' }, { status: 400 });
  }

  const db = createServiceClient();
  const readDb = auth.isAdmin ? db : await createClient();

  const { data: existing } = await readDb
    .from('reports')
    .select('status, report_data, generation_started_at')
    .eq('id', reportId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  const rd = existing?.report_data as { days?: unknown[] } | null | undefined;
  const alreadyDone =
    existing?.status === 'complete' &&
    Array.isArray(rd?.days) &&
    (rd!.days as unknown[]).length > 0;

  if (alreadyDone) {
    return NextResponse.json({ reportId, ok: true, status: 'complete', skipped: true });
  }

  const forceRestart = body.forceRestart === true;

  if (
    existing?.status === 'generating' &&
    isYoungGenerating(existing.generation_started_at) &&
    !forceRestart
  ) {
    return NextResponse.json(
      {
        reportId,
        ok: true,
        status: 'generating',
        skippedPipeline: true,
        message: 'Generation already in progress — keep polling status.',
      },
      { status: 202 },
    );
  }

  const tzBody = body.timezone_offset;
  const timezoneOffset =
    typeof tzBody === 'number' && Number.isFinite(tzBody)
      ? tzBody
      : typeof tzBody === 'string' && tzBody.trim() !== ''
        ? parseInt(tzBody, 10) || 0
        : 0;

  const nowIso = new Date().toISOString();

  const { error: upsertError } = await db.from('reports').upsert(
    {
      id: reportId,
      user_id: auth.user.id,
      user_email: auth.user.email ?? '',
      native_name: body.name ?? 'Unknown',
      birth_date: body.birth_date ?? '2000-01-01',
      birth_time: body.birth_time ?? '12:00:00',
      birth_city: body.birth_city ?? 'Unknown',
      birth_lat: body.birth_lat ?? null,
      birth_lng: body.birth_lng ?? null,
      current_city: body.current_city ?? null,
      current_lat: body.current_lat ?? null,
      current_lng: body.current_lng ?? null,
      timezone_offset: timezoneOffset || null,
      plan_type: body.plan_type ?? '7day',
      status: 'generating',
      payment_status: body.payment_status ?? 'free',
      generation_started_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: 'id' },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const runUrl = `${process.env.NEXT_PUBLIC_URL || 'https://www.vedichour.com'}/api/reports/run`;
  fetch(runUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: request.headers.get('cookie') || '',
    },
    body: JSON.stringify({ reportId }),
  }).catch((err) => console.error('Failed to trigger /api/reports/run:', err));

  return NextResponse.json(
    { reportId, ok: true, status: 'generating', runRequired: true },
    { status: 202 },
  );
}
