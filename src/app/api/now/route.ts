import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';
import { getDayOutcomeTier } from '@/lib/guidance/labels';
import type { NowResponse } from '@/lib/api/nowTypes';

export const dynamic = 'force-dynamic';

const EPHEMERIS_URL = (
  process.env.EPHEMERIS_SERVICE_URL ??
  process.env.EPHEMERIS_API_URL ??
  'http://localhost:8000'
).trim();

const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

const DUBAI_LAT = 25.2048;
const DUBAI_LNG = 55.2708;
const DUBAI_TZ_MIN = 240;

/** In-memory cache: key → { expires, body } */
const gridCache = new Map<string, { expires: number; body: unknown }>();
const CACHE_MS = 60 * 60 * 1000;

interface GridSlot {
  slot_index?: number;
  display_label?: string;
  start_iso?: string;
  end_iso?: string;
  dominant_hora?: string;
  dominant_choghadiya?: string;
  transit_lagna?: string;
  transit_lagna_house?: number;
  is_rahu_kaal?: boolean;
  score?: number;
}

function lagnaIndexFromRow(lagnaSign: string | null | undefined, reportData: unknown): number {
  const rd = reportData as { nativity?: { natal_chart?: { lagna?: string } } } | null | undefined;
  const name = (lagnaSign || rd?.nativity?.natal_chart?.lagna || '').trim();
  const ix = SIGNS.indexOf(name as (typeof SIGNS)[number]);
  if (ix >= 0) return ix;
  return 3;
}

function hhmm(isoOrTime: string | undefined): string {
  if (!isoOrTime) return '—';
  if (isoOrTime.includes('T')) {
    const t = isoOrTime.slice(11, 16);
    return t || '—';
  }
  return isoOrTime.slice(0, 5);
}

function tzLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const a = Math.abs(offsetMinutes);
  const h = Math.floor(a / 60);
  const m = a % 60;
  if (m === 0) return `UTC${sign}${h}`;
  return `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}

function localClockFromUtc(offsetMinutes: number): { h: number; m: number } {
  const d = new Date();
  let total =
    d.getUTCHours() * 60 +
    d.getUTCMinutes() +
    d.getUTCSeconds() / 60 +
    offsetMinutes;
  total = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60) % 24;
  const m = Math.floor(total % 60);
  return { h, m };
}

function generateDirective(slot: GridSlot): string {
  if (slot.is_rahu_kaal) return 'RAHU KAAL ACTIVE — COMPLETE ONLY ROUTINE TASKS';
  const sc = typeof slot.score === 'number' ? slot.score : 50;
  if (sc >= 80) return 'PEAK WINDOW — ACT ON YOUR MOST IMPORTANT GOAL NOW';
  if (sc >= 65) return 'FAVORABLE — ADVANCE KEY PROJECTS WITH CONFIDENCE';
  if (sc >= 50) return 'MODERATE — PROCEED WITH ROUTINE WORK';
  if (sc >= 35) return 'CAUTION — AVOID NEW COMMITMENTS, REVIEW ONLY';
  return 'LOW ENERGY — REST, REFLECT, COMPLETE EXISTING TASKS ONLY';
}

function transitLabel(slot: GridSlot): string {
  const s = slot.transit_lagna ?? '—';
  const h = slot.transit_lagna_house;
  return typeof h === 'number' ? `${s} H${h}` : s;
}

function timeStrToMinutes(s: string | undefined): number | null {
  if (!s) return null;
  const parts = s.split(':').map((x) => Number(x));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  return parts[0]! * 60 + parts[1]!;
}

/** Rahu Kaal times are local civil HH:MM(:SS) for the grid day. */
function isNowInRahuWindow(
  rkStart: string | undefined,
  rkEnd: string | undefined,
  offsetMinutes: number
): boolean {
  const a = timeStrToMinutes(rkStart);
  const b = timeStrToMinutes(rkEnd);
  if (a == null || b == null) return false;
  const { h, m } = localClockFromUtc(offsetMinutes);
  const nowM = h * 60 + m;
  if (b > a) return nowM >= a && nowM < b;
  return nowM >= a || nowM < b;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('reports')
    .select(
      'lagna_sign, current_lat, current_lng, timezone_offset, birth_lat, birth_lng, report_data, status, updated_at'
    )
    .eq('user_id', auth.user.id)
    .not('lagna_sign', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json(
      { error: 'No saved chart with lagna found — generate a report first.' },
      { status: 404 }
    );
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const lat = Number(row.current_lat ?? row.birth_lat ?? DUBAI_LAT) || DUBAI_LAT;
  const lng = Number(row.current_lng ?? row.birth_lng ?? DUBAI_LNG) || DUBAI_LNG;
  const tz =
    typeof row.timezone_offset === 'number' && Number.isFinite(row.timezone_offset)
      ? row.timezone_offset
      : DUBAI_TZ_MIN;
  const natalIdx = lagnaIndexFromRow(row.lagna_sign as string, row.report_data);

  const cacheKey = `${auth.user.id}:${dateStr}:${lat}:${lng}:${tz}:${natalIdx}`;
  let entry = gridCache.get(cacheKey);
  if (!entry || entry.expires < Date.now()) {
    try {
      const res = await fetch(`${EPHEMERIS_URL.replace(/\/$/, '')}/generate-daily-grid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          current_lat: lat,
          current_lng: lng,
          timezone_offset_minutes: tz,
          natal_lagna_sign_index: natalIdx,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: 'Ephemeris service unavailable', retry_after: 30 },
          { status: 503 }
        );
      }
      const body = await res.json();
      entry = { expires: Date.now() + CACHE_MS, body };
      gridCache.set(cacheKey, entry);
    } catch {
      return NextResponse.json(
        { error: 'Ephemeris service unavailable', retry_after: 30 },
        { status: 503 }
      );
    }
  }

  const payload = entry.body as {
    slots?: GridSlot[];
    day_score?: number;
    panchang?: Record<string, string>;
    rahu_kaal?: { start?: string; end?: string };
  };
  const slots = (payload.slots ?? []) as GridSlot[];
  if (slots.length !== 18) {
    return NextResponse.json({ error: 'Invalid grid from ephemeris' }, { status: 502 });
  }

  const tMs = Date.now();
  let current: GridSlot | undefined;
  for (const s of slots) {
    const a = Date.parse(s.start_iso ?? '');
    const b = Date.parse(s.end_iso ?? '');
    if (Number.isFinite(a) && Number.isFinite(b) && tMs >= a && tMs < b) {
      current = s;
      break;
    }
  }
  if (!current) {
    current = slots[0];
  }

  const curSc = Math.round(Number(current.score ?? 0));
  const future = slots.filter((s) => {
    const a = Date.parse(s.start_iso ?? '');
    return Number.isFinite(a) && a > tMs && !s.is_rahu_kaal;
  });
  const better = future.filter((s) => Math.round(Number(s.score ?? 0)) > curSc);
  const pool = better.length ? better : [];
  let nextPeak: GridSlot | null = null;
  if (pool.length) {
    nextPeak = pool.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a));
  }

  const rk = payload.rahu_kaal ?? {};
  const rkStart = hhmm(rk.start);
  const rkEnd = hhmm(rk.end);
  const rkActive =
    isNowInRahuWindow(rk.start, rk.end, tz) || Boolean(current.is_rahu_kaal);

  const minutesUntil =
    nextPeak && nextPeak.start_iso
      ? Math.max(0, Math.round((Date.parse(nextPeak.start_iso) - tMs) / 60_000))
      : 0;

  const p = payload.panchang ?? {};
  const dayScore = typeof payload.day_score === 'number' ? payload.day_score : 50;
  const { tier, emoji } = getDayOutcomeTier(dayScore);

  const out: NowResponse = {
    generated_at: new Date().toISOString(),
    timezone_label: tzLabel(tz),
    timezone_offset_minutes: tz,
    current: {
      time_range: String(current.display_label ?? '—'),
      score: Math.round(Number(current.score ?? 50)),
      hora_ruler: String(current.dominant_hora ?? 'Sun'),
      choghadiya: String(current.dominant_choghadiya ?? 'Shubh'),
      transit_lagna: transitLabel(current),
      transit_house: Number(current.transit_lagna_house ?? 1),
      is_rahu_kaal: Boolean(current.is_rahu_kaal),
      action_directive: generateDirective(current),
    },
    next_peak: nextPeak
      ? {
          time_range: String(nextPeak.display_label ?? '—'),
          score: Math.round(Number(nextPeak.score ?? 0)),
          hora_ruler: String(nextPeak.dominant_hora ?? 'Sun'),
          choghadiya: String(nextPeak.dominant_choghadiya ?? 'Shubh'),
          minutes_until: minutesUntil,
          transit_summary: transitLabel(nextPeak),
        }
      : null,
    rahu_kaal: {
      start: rkStart,
      end: rkEnd,
      is_active_now: rkActive,
    },
    day: {
      score: dayScore,
      label: tier,
      emoji,
      yoga: String(p.yoga ?? ''),
      nakshatra: String(p.nakshatra ?? ''),
      tithi: String(p.tithi ?? ''),
      moon_sign: String(p.moon_sign ?? ''),
    },
  };

  const res = NextResponse.json(out);
  res.headers.set('Cache-Control', 'private, max-age=60');
  return res;
}
