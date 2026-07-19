export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS, shouldRateLimitLlmForUser } from '@/lib/api/rateLimit';
import {
  containsDeterministicHourlyFallback,
  hasCompleteHourlyProse,
} from '@/lib/reports/hourlyProseIntegrity';

/**
 * POST /api/reports/[id]/hourly-day  { date: 'YYYY-MM-DD' }
 *
 * On-demand hourly prose for ONE day of an existing report (bounded-window
 * report-gen: the pipeline writes full AI hourly commentary only for the near
 * window; far days carry deterministic guidance and are upgraded here the first
 * time the owner opens them). Generated prose is persisted back into
 * report_data.days[].slots so it is written exactly once per day.
 *
 * Paid feature — mirrors the /ask gate: owner + genuinely entitled
 * (paid / 100%-promo / admin) before any LLM spend.
 */

interface StoredSlot {
  slot_index?: number;
  display_label?: string;
  dominant_hora?: string;
  hora_planet?: string;
  dominant_choghadiya?: string;
  choghadiya?: string;
  transit_lagna?: string;
  transit_lagna_house?: number;
  is_rahu_kaal?: boolean;
  score?: number;
  commentary?: string;
  commentary_short?: string;
  guidance_v2?: {
    summary_plain?: string;
  };
  [k: string]: unknown;
}
interface StoredDay {
  date?: string;
  ai_prose?: boolean;
  panchang?: Record<string, unknown>;
  rahu_kaal?: { start?: string; end?: string } | null;
  slots?: StoredSlot[];
  [k: string]: unknown;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const reportId = params?.id;
  if (!reportId) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const db = createServiceClient();
  const { data: reportRow } = await db
    .from('reports')
    .select('user_id, payment_status, report_data, lagna_sign, dasha_mahadasha, dasha_antardasha')
    .eq('id', reportId)
    .maybeSingle();

  // Ownership: don't reveal existence of other users' reports.
  if (!reportRow || (reportRow.user_id !== auth.user.id && auth.isAdmin !== true)) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
  // Entitlement: paid purchase, 100%-promo grant, or admin.
  const entitled =
    auth.isAdmin === true ||
    reportRow.payment_status === 'paid' ||
    reportRow.payment_status === 'promo';
  if (!entitled) {
    return NextResponse.json({ error: 'This feature is part of a paid report.' }, { status: 402 });
  }

  let body: { date?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const date = String(body.date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) required' }, { status: 400 });
  }

  const reportData = (reportRow.report_data ?? {}) as { days?: StoredDay[] };
  const days = Array.isArray(reportData.days) ? reportData.days : [];
  const dayIdx = days.findIndex((d) => d?.date === date);
  if (dayIdx < 0) {
    return NextResponse.json({ error: 'Date not in this report' }, { status: 404 });
  }
  const day = days[dayIdx];

  // Idempotent unless this is an older report affected by the broken assembly
  // marker, where validation patched a few slots but deterministic text remained.
  if (day.ai_prose === true && !containsDeterministicHourlyFallback(day.slots)) {
    return NextResponse.json({ date, cached: true, slots: day.slots ?? [] });
  }

  // Rate limit AFTER the cached path so cache hits stay free.
  if (shouldRateLimitLlmForUser(auth)) {
    const rlKey = getRateLimitKey(req, 'user' in auth ? auth.user.id : undefined);
    const rl = await checkRateLimit(`hourly-day:${rlKey}`, RATE_LIMITS.commentary.limit, RATE_LIMITS.commentary.windowMs);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Please wait a moment before generating more days.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }
  }

  // Build the hourly-batch request from the stored day. Slots persisted by the
  // orchestrator keep both the original dominant_* fields (spread) and the
  // mapped hora_planet/choghadiya — read defensively.
  const batchSlots = (day.slots ?? []).slice(0, 18).map((s, i) => ({
    slot_index: typeof s.slot_index === 'number' ? s.slot_index : i,
    display_label: String(s.display_label ?? ''),
    dominant_hora: String(s.dominant_hora ?? s.hora_planet ?? 'Sun'),
    dominant_choghadiya: String(s.dominant_choghadiya ?? s.choghadiya ?? 'Shubh'),
    transit_lagna: String(s.transit_lagna ?? 'Aries'),
    transit_lagna_house: typeof s.transit_lagna_house === 'number' ? s.transit_lagna_house : 1,
    is_rahu_kaal: Boolean(s.is_rahu_kaal),
    score: typeof s.score === 'number' ? s.score : 55,
  }));
  if (batchSlots.length === 0) {
    return NextResponse.json({ error: 'No hourly slots stored for this day' }, { status: 409 });
  }

  try {
    const res = await fetch(`${req.nextUrl.origin}/api/commentary/hourly-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') ?? '',
      },
      body: JSON.stringify({
        lagnaSign: reportRow.lagna_sign,
        mahadasha: reportRow.dasha_mahadasha ?? 'Unknown',
        antardasha: reportRow.dasha_antardasha ?? 'Unknown',
        days: [{
          dayIndex: 0,
          date,
          panchang: day.panchang,
          rahu_kaal: day.rahu_kaal ?? undefined,
          slots: batchSlots,
        }],
      }),
      signal: AbortSignal.timeout(180_000),
    });

    // 206 = LLM unavailable / fell back to template. Don't persist template text
    // into a paid report — tell the client to retry shortly.
    if (res.status === 206 || !res.ok) {
      return NextResponse.json(
        { error: 'The AI writer is briefly busy — try again in a moment.' },
        { status: 503 },
      );
    }

    const j = (await res.json()) as { days?: Array<{ slots?: Array<{ slot_index?: number; commentary?: string; commentary_short?: string }> }> };
    const proseSlots = j.days?.[0]?.slots ?? [];
    const expectedSlotIndexes = batchSlots.map((slot) => slot.slot_index);
    if (!hasCompleteHourlyProse(proseSlots, expectedSlotIndexes)) {
      return NextResponse.json(
        { error: 'The AI writer is briefly busy — try again in a moment.' },
        { status: 503 },
      );
    }
    const proseMap = new Map<number, { commentary: string; commentary_short?: string }>();
    proseSlots.forEach((s) => {
      if (typeof s.slot_index === 'number' && typeof s.commentary === 'string' && s.commentary.trim()) {
        proseMap.set(s.slot_index, { commentary: s.commentary, commentary_short: s.commentary_short });
      }
    });
    if (proseMap.size === 0) {
      return NextResponse.json(
        { error: 'The AI writer is briefly busy — try again in a moment.' },
        { status: 503 },
      );
    }

    const updatedSlots = (day.slots ?? []).map((s, i) => {
      const p = proseMap.get(typeof s.slot_index === 'number' ? s.slot_index : i);
      if (!p) return s;
      return {
        ...s,
        commentary: p.commentary,
        commentary_short: p.commentary_short?.trim() || `${p.commentary.split('.')[0] ?? ''}.`,
      };
    });

    // Persist: write the upgraded day back into report_data (single-row update).
    const updatedDays = days.slice();
    updatedDays[dayIdx] = { ...day, slots: updatedSlots, ai_prose: true };
    const { error: upErr } = await db
      .from('reports')
      .update({ report_data: { ...reportData, days: updatedDays }, updated_at: new Date().toISOString() })
      .eq('id', reportId);
    if (upErr) {
      // Still return the prose (user sees it this session); next open regenerates.
      console.error('[hourly-day] persist failed:', upErr.message);
    }

    return NextResponse.json({ date, cached: false, slots: updatedSlots });
  } catch (e) {
    console.error('[hourly-day] failed:', e instanceof Error ? e.message.slice(0, 200) : String(e));
    return NextResponse.json(
      { error: 'Could not generate this day right now. Please try again.' },
      { status: 500 },
    );
  }
}
