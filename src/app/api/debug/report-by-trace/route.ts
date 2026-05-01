/**
 * Admin: look up report rows by `generation_trace_id` (correlation ID from /reports/start).
 * Requires signed-in user whose email is in ADMIN_EMAILS.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/bypass';
import {
  inferReportFailureBucket,
  inferReportFailureBucketFromCode,
} from '@/lib/reports/reportErrors';

function diagnosticMessageFromRow(row: {
  generation_error_code?: string | null;
  generation_log?: unknown;
}): string {
  const log = row.generation_log;
  if (Array.isArray(log)) {
    for (let i = log.length - 1; i >= 0; i--) {
      const entry = log[i] as { level?: string; message?: string; step?: string };
      if (entry?.level === 'error' && (entry.message || entry.step)) {
        return [entry.step, entry.message].filter(Boolean).join(' — ');
      }
    }
  }
  return row.generation_error_code ? String(row.generation_error_code) : '';
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const trace =
    request.nextUrl.searchParams.get('trace') ??
    request.nextUrl.searchParams.get('generation_trace_id') ??
    '';
  const trimmed = trace.trim();
  if (!trimmed || !UUID_RE.test(trimmed)) {
    return NextResponse.json(
      { error: 'Invalid or missing trace (expected UUID in ?trace= or ?generation_trace_id=)' },
      { status: 400 },
    );
  }

  const db = createServiceClient();
  const { data: rows, error } = await db
    .from('reports')
    .select(
      [
        'id',
        'user_id',
        'user_email',
        'status',
        'generation_step',
        'generation_progress',
        'generation_trace_id',
        'generation_started_at',
        'generation_completed_at',
        'generation_error_code',
        'generation_error_at_phase',
        'generation_log',
        'updated_at',
        'created_at',
        'native_name',
        'plan_type',
      ].join(', '),
    )
    .eq('generation_trace_id', trimmed)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reports = (rows ?? []).map((r) => {
    const row = r as {
      generation_error_code?: string | null;
      generation_error_at_phase?: string | null;
      generation_log?: unknown;
      status?: string;
    };
    const msg = diagnosticMessageFromRow(row);
    const bucketFromCode = inferReportFailureBucketFromCode(row.generation_error_code);
    const failure_bucket =
      bucketFromCode ??
      inferReportFailureBucket(msg, row.generation_error_at_phase ?? undefined, row.generation_error_code);
    return { ...row, failure_bucket };
  });

  return NextResponse.json({
    generation_trace_id: trimmed,
    count: reports.length,
    reports,
    failure_bucket_legend: [
      'internal_job_auth — job JWT / 401 on internal routes',
      'llm_commentary — 206 / LLM provider errors',
      'internal_fetch_base — failed fetch / bad dispatch host',
      'ephemeris — Swiss / birth chart service',
      'platform_budget — Vercel step budget / hard-kill',
      'client_status_poll — STATUS_POLL_TIMEOUT / stale UX',
      'duplicate_start_lock — blocked duplicate start',
      'inngest_or_queue — queue dispatch failures',
      'unknown — inspect generation_log + generation_error_code',
    ],
  });
}
