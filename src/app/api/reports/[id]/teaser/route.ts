export const maxDuration = 120;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import { resolveTimingCoords } from '@/lib/utils/coords';

/**
 * POST /api/reports/[id]/teaser
 *
 * The free preview's proof-of-value: the seeker's REAL next-30-day score curve.
 *
 * This is deterministic ephemeris output — no LLM spend — so it is cheap to give
 * away, and it is the most persuasive honest thing we have: dates they can verify
 * against their own life. What stays paid is the INTERPRETATION (why a day scores
 * what it does, the hour-by-hour windows, the written guidance).
 *
 * Stored under report_data.teaser, deliberately separate from `day_scores` so the
 * existing paywall narrowing of that column is untouched.
 */

interface TeaserDay { date: string; score: number }

interface TeaserCache {
  days?: TeaserDay[];
  generated_at?: string;
  /** Coords + lagna the curve was computed for — used to invalidate stale Null-Island caches. */
  lat?: number;
  lng?: number;
  lagna_index?: number;
}

const EPHEMERIS_URL = (
  process.env.EPHEMERIS_SERVICE_URL ??
  process.env.EPHEMERIS_API_URL ??
  'http://localhost:8000'
).trim();

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const HORIZON_DAYS = 30;

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const reportId = params?.id;
  if (!reportId) return NextResponse.json({ teaser: null }, { status: 404 });

  const db = createServiceClient();
  const { data: row } = await db
    .from('reports')
    .select('user_id, lagna_sign, current_lat, current_lng, birth_lat, birth_lng, timezone_offset, report_data')
    .eq('id', reportId)
    .maybeSingle();

  // Ownership only — this is the FREE hook, so no entitlement gate.
  if (!row || (row.user_id !== auth.user.id && auth.isAdmin !== true)) {
    return NextResponse.json({ teaser: null }, { status: 404 });
  }

  const lagnaIndex = SIGNS.indexOf(String(row.lagna_sign ?? ''));
  // Refuse to invent an Aries curve when lagna is missing/unrecognised — that
  // would be a fabricated 30-day score strip, cached forever under report_data.teaser.
  if (lagnaIndex < 0) {
    return NextResponse.json({ teaser: null });
  }

  const timing = resolveTimingCoords(row);
  if (!timing) {
    return NextResponse.json({ teaser: null });
  }

  const reportData = (row.report_data ?? {}) as { teaser?: TeaserCache };
  const cached = reportData.teaser;
  if (
    Array.isArray(cached?.days) &&
    cached.days.length > 0 &&
    cached.lat === timing.lat &&
    cached.lng === timing.lng &&
    cached.lagna_index === lagnaIndex
  ) {
    return NextResponse.json({ teaser: { days: cached.days, cached: true } });
  }

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const dates = Array.from({ length: HORIZON_DAYS }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return ymd(d);
  });

  try {
    const res = await fetch(`${EPHEMERIS_URL}/generate-daily-grid-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dates,
        current_lat: timing.lat,
        current_lng: timing.lng,
        timezone_offset_minutes: Number(row.timezone_offset ?? 0),
        natal_lagna_sign_index: lagnaIndex,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) return NextResponse.json({ teaser: null });

    const j = (await res.json()) as { days?: Array<{ date?: string; day_score?: number }> };
    const days: TeaserDay[] = (j.days ?? [])
      .filter((d) => typeof d?.day_score === 'number' && d?.date)
      .map((d) => ({ date: String(d.date), score: Number(d.day_score) }));
    if (days.length === 0) return NextResponse.json({ teaser: null });

    const teaser: TeaserCache = {
      days,
      generated_at: new Date().toISOString(),
      lat: timing.lat,
      lng: timing.lng,
      lagna_index: lagnaIndex,
    };

    await db
      .from('reports')
      .update({
        report_data: { ...reportData, teaser },
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    return NextResponse.json({ teaser: { days, cached: false } });
  } catch (e) {
    console.error('[teaser]', e instanceof Error ? e.message.slice(0, 160) : String(e));
    return NextResponse.json({ teaser: null });
  }
}
