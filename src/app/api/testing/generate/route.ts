export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';

/**
 * /testing harness backend (ADMIN ONLY). Runs the proposed fast report-gen
 * pipeline and returns real, measured timings — WITHOUT any DB writes, payments,
 * or Inngest. It exists to prove the ≤10-min architecture on the live stack:
 *
 *   1. Natal chart (1 ephemeris call)
 *   2. Deterministic score grid for the WHOLE horizon via ONE batched ephemeris
 *      call (/generate-daily-grid-batch). Falls back to per-day parallel calls if
 *      the batch endpoint isn't deployed to Railway yet, so the page works today.
 *   3. A BOUNDED LLM prose sample (first day only) — to show the AI cost is
 *      constant regardless of horizon (the only part that can't scale linearly).
 */

const EPHEMERIS_URL = (
  process.env.EPHEMERIS_SERVICE_URL ??
  process.env.EPHEMERIS_API_URL ??
  'http://localhost:8000'
).trim();

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

interface GridSlot {
  slot_index?: number;
  display_label?: string;
  score?: number;
  is_rahu_kaal?: boolean;
  dominant_hora?: string;
  dominant_choghadiya?: string;
  transit_lagna?: string;
  transit_lagna_house?: number;
}
interface GridDay {
  date?: string;
  day_score?: number;
  slots?: GridSlot[];
  panchang?: unknown;
  rahu_kaal?: unknown;
  planet_positions?: unknown;
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

async function fetchJson(url: string, body: unknown, ms: number): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ms),
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, data };
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  let body: {
    birth_date?: string;
    birth_time?: string;
    birth_city?: string;
    birth_lat?: number;
    birth_lng?: number;
    current_lat?: number;
    current_lng?: number;
    timezone_offset_minutes?: number;
    horizon_days?: number;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const birth_date = String(body.birth_date ?? '').trim();
  const birth_time = (String(body.birth_time ?? '').trim() || '12:00:00');
  const birth_city = String(body.birth_city ?? '').trim() || 'Unknown';
  const birth_lat = Number(body.birth_lat ?? 0);
  const birth_lng = Number(body.birth_lng ?? 0);
  const current_lat = Number(body.current_lat ?? birth_lat);
  const current_lng = Number(body.current_lng ?? birth_lng);
  const timezone_offset_minutes = Number(body.timezone_offset_minutes ?? 0);
  const horizon_days = Math.max(1, Math.min(800, Math.floor(Number(body.horizon_days ?? 30))));

  if (!birth_date) {
    return NextResponse.json({ error: 'birth_date is required (YYYY-MM-DD)' }, { status: 400 });
  }

  const t0 = Date.now();

  // ---- 1. Natal chart (Python /natal-chart directly; no auth/Redis) ----
  let lagnaSign = 'Aries';
  let lagnaIndex = 0;
  let mahadasha = 'Unknown';
  let antardasha = 'Unknown';
  const tNatal = Date.now();
  try {
    const natalTime = /^\d{2}:\d{2}$/.test(birth_time) ? `${birth_time}:00` : birth_time;
    const { ok, data } = await fetchJson(`${EPHEMERIS_URL}/natal-chart`, {
      birth_date, birth_time: natalTime, birth_city, birth_lat, birth_lng,
    }, 60_000);
    if (!ok || !data) {
      return NextResponse.json({ error: 'Ephemeris natal-chart call failed — is the Python service reachable?' }, { status: 502 });
    }
    const nd = (data as { data?: Record<string, unknown> }).data ?? (data as Record<string, unknown>);
    lagnaSign = String(nd.lagna ?? 'Aries');
    lagnaIndex = Math.max(0, SIGNS.indexOf(lagnaSign));
    const cd = (nd.current_dasha ?? {}) as { mahadasha?: string; antardasha?: string };
    mahadasha = cd.mahadasha || 'Unknown';
    antardasha = cd.antardasha || 'Unknown';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Natal chart failed: ${msg.slice(0, 160)}` }, { status: 502 });
  }
  const natalMs = Date.now() - tNatal;

  // ---- 2. Deterministic score grid for the WHOLE horizon ----
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let i = 0; i < horizon_days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    dates.push(ymd(d));
  }

  let gridDays: GridDay[] = [];
  let gridSource: 'batch' | 'per-day-fallback' = 'batch';
  let gridErrors = 0;
  const tGrid = Date.now();
  try {
    const batch = await fetchJson(`${EPHEMERIS_URL}/generate-daily-grid-batch`, {
      dates, current_lat, current_lng, natal_lagna_sign_index: lagnaIndex, timezone_offset_minutes,
    }, 290_000);
    if (batch.ok && batch.data && Array.isArray((batch.data as { days?: unknown }).days)) {
      const bd = batch.data as { days: GridDay[]; errors?: unknown[] };
      gridDays = bd.days;
      gridErrors = Array.isArray(bd.errors) ? bd.errors.length : 0;
    } else {
      // Batch endpoint not deployed yet (404) → per-day parallel fallback.
      gridSource = 'per-day-fallback';
      // Leave ~100s of the 300s budget for the LLM sample + response assembly.
      gridDays = await perDayFallback(dates, current_lat, current_lng, lagnaIndex, timezone_offset_minutes, Date.now() + 200_000);
    }
  } catch {
    gridSource = 'per-day-fallback';
    try {
      gridDays = await perDayFallback(dates, current_lat, current_lng, lagnaIndex, timezone_offset_minutes, Date.now() + 200_000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Grid computation failed: ${msg.slice(0, 160)}` }, { status: 502 });
    }
  }
  // In fallback mode, days left as empty placeholders (slow Python / deadline hit) count as errors.
  if (gridSource === 'per-day-fallback') {
    gridErrors = gridDays.filter((d) => !d.slots?.length).length;
  }
  const gridMs = Date.now() - tGrid;

  // ---- 3. Bounded LLM prose sample (first day only) ----
  let llmSample: { date: string; partial: boolean; slots: Array<{ slot_index: number; display_label: string; score: number; is_rahu_kaal: boolean; commentary: string }> } | null = null;
  let llmSampleMs = 0;
  const day0 = gridDays[0];
  if (day0?.slots?.length) {
    const tLlm = Date.now();
    try {
      const res = await fetch(`${request.nextUrl.origin}/api/commentary/hourly-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward the admin's session so the internal LLM route authenticates.
          cookie: request.headers.get('cookie') ?? '',
          ...(process.env.BYPASS_SECRET ? { 'x-bypass-token': process.env.BYPASS_SECRET } : {}),
        },
        body: JSON.stringify({
          lagnaSign,
          mahadasha,
          antardasha,
          days: [{
            dayIndex: 0,
            date: day0.date,
            planet_positions: day0.planet_positions,
            panchang: day0.panchang,
            rahu_kaal: day0.rahu_kaal,
            slots: day0.slots,
          }],
        }),
        signal: AbortSignal.timeout(180_000),
      });
      const partial = res.status === 206;
      const j = (await res.json().catch(() => ({}))) as { days?: Array<{ slots?: Array<{ slot_index?: number; commentary?: string }> }> };
      const proseSlots = j.days?.[0]?.slots ?? [];
      const proseMap = new Map<number, string>();
      proseSlots.forEach((s) => { if (typeof s.slot_index === 'number' && typeof s.commentary === 'string') proseMap.set(s.slot_index, s.commentary); });
      llmSample = {
        date: String(day0.date ?? ''),
        partial,
        slots: (day0.slots ?? []).slice(0, 18).map((s, i) => ({
          slot_index: s.slot_index ?? i,
          display_label: String(s.display_label ?? ''),
          score: Number(s.score ?? 0),
          is_rahu_kaal: Boolean(s.is_rahu_kaal),
          commentary: proseMap.get(s.slot_index ?? i) ?? '',
        })),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      llmSample = { date: String(day0.date ?? ''), partial: true, slots: [{ slot_index: 0, display_label: 'error', score: 0, is_rahu_kaal: false, commentary: `LLM sample failed: ${msg.slice(0, 120)}` }] };
    }
    llmSampleMs = Date.now() - tLlm;
  }

  const totalMs = Date.now() - t0;

  // Compact whole-horizon grid (day score + 18 slot scores per day).
  const days = gridDays.map((d) => ({
    date: String(d.date ?? ''),
    dayScore: Number(d.day_score ?? 0),
    slotScores: (d.slots ?? []).slice(0, 18).map((s) => Number(s.score ?? 0)),
  }));

  // Projection: what full AI prose for the whole horizon WOULD cost (5 days/batch).
  const llmBatchesForFullHorizon = Math.ceil(horizon_days / 5);

  return NextResponse.json({
    ok: true,
    horizonDays: horizon_days,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    natal: { lagnaSign, lagnaIndex, mahadasha, antardasha },
    timings: { natalMs, gridMs, llmSampleMs, totalMs },
    gridSource,
    gridErrors,
    days,
    llmSample,
    projection: {
      llmBatchesForFullHorizon,
      note: `Deterministic grid for all ${horizon_days} days took ${gridMs}ms. Full AI prose for every day would need ~${llmBatchesForFullHorizon} LLM batch calls; the ≤10-min design generates prose only for a bounded near-window (constant cost) and loads the rest on demand.`,
    },
  });
}

/**
 * Parallel per-day fallback (bounded concurrency) when the batch endpoint isn't
 * available. Respects a wall-clock `deadline` so a large horizon against a slow
 * Python service returns the days that completed (rest stay as skipped
 * placeholders) instead of running past maxDuration and getting the whole
 * function killed. Days left as placeholders are counted as gridErrors by caller.
 */
async function perDayFallback(
  dates: string[], current_lat: number, current_lng: number, natal_lagna_sign_index: number, timezone_offset_minutes: number,
  deadline: number,
): Promise<GridDay[]> {
  const CONCURRENCY = 8;
  // Pre-seed every day as a skipped placeholder; workers overwrite until the deadline.
  const out: GridDay[] = dates.map((dt) => ({ date: dt, day_score: 0, slots: [] }));
  let cursor = 0;
  async function worker() {
    while (cursor < dates.length && Date.now() < deadline) {
      const i = cursor++;
      try {
        const { ok, data } = await fetchJson(`${EPHEMERIS_URL}/generate-daily-grid`, {
          date: dates[i], current_lat, current_lng, timezone_offset_minutes, natal_lagna_sign_index,
        }, 10_000);
        if (ok && data) out[i] = data as GridDay;
      } catch { /* leave placeholder; counted as a grid error */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, dates.length) }, () => worker()));
  return out;
}
