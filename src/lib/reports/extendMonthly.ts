/**
 * Appends days 8–30 to an existing 7-day report after a Monthly upgrade payment.
 * Reuses /api/agents/daily-grid and /api/commentary/hourly-batch (same contract as orchestrator).
 */

import { createServiceClient } from '@/lib/supabase/admin';
import { getCanonicalScoreLabel, getDayOutcomeTier } from '@/lib/guidance/labels';
import { buildSlotGuidance, buildDayBriefing } from '@/lib/guidance/builder';
import { isV2GuidanceEnabled } from '@/lib/guidance/featureFlag';
import type { ReportData } from '@/lib/agents/types';

const SIGNS_FOR_LAGNA = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄',
};

function formatDayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00Z');
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[d.getUTCDay()]} · ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
  } catch {
    return dateStr;
  }
}

function toLabel(score: number, isRk: boolean) {
  return getCanonicalScoreLabel(score, isRk);
}

type SlotInt = {
  slot_index: number;
  display_label: string;
  dominant_hora: string;
  dominant_choghadiya: string;
  transit_lagna: string;
  transit_lagna_house: number;
  is_rahu_kaal: boolean;
  score: number;
  commentary?: string;
  commentary_short?: string;
};

type DayInt = {
  date: string;
  panchang: Record<string, unknown>;
  rahu_kaal: { start: string; end: string };
  day_score: number;
  planet_positions?: unknown;
  slots: SlotInt[];
};

function serviceHeaders(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return {
    'Content-Type': 'application/json',
    'x-service-key': key,
  };
}

async function fetchJSON(url: string, init: RequestInit, label: string): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(280_000) });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${label} HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Extends a paid 7-day report to 30 forecast days. Idempotent if ≥30 days already present.
 */
export async function extendReportToMonthly(baseUrl: string, reportId: string): Promise<{ ok: boolean; message: string }> {
  const db = createServiceClient();
  const { data: row, error } = await db
    .from('reports')
    .select(
      'id, user_id, report_data, birth_lat, birth_lng, timezone_offset, current_lat, current_lng, lagna_sign, dasha_mahadasha, dasha_antardasha',
    )
    .eq('id', reportId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, message: 'Report not found' };
  }

  const reportData = row.report_data as ReportData | null;
  const existingDays = Array.isArray(reportData?.days) ? reportData!.days : [];
  if (existingDays.length >= 30) {
    return { ok: true, message: 'Already extended' };
  }
  if (existingDays.length < 7) {
    return { ok: false, message: 'Report has fewer than 7 days — cannot extend' };
  }

  const lastDayStr = existingDays[6]?.date as string;
  const start = new Date(lastDayStr + 'T12:00:00');
  const dateRange: string[] = [];
  for (let i = 1; i <= 23; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    dateRange.push(d.toISOString().split('T')[0]);
  }

  const cLat = Number(row.current_lat ?? row.birth_lat ?? 25.2);
  const cLng = Number(row.current_lng ?? row.birth_lng ?? 55.27);
  const tz = typeof row.timezone_offset === 'number' ? row.timezone_offset : 240;
  const lagna = String(row.lagna_sign ?? 'Aries');
  const natal_lagna_sign_index = Math.max(0, SIGNS_FOR_LAGNA.indexOf(lagna));
  const md = String(row.dasha_mahadasha ?? 'Sun');
  const ad = String(row.dasha_antardasha ?? 'Moon');

  const h = serviceHeaders();
  const gridResults: unknown[] = [];

  for (let off = 0; off < dateRange.length; off += 8) {
    const chunk = dateRange.slice(off, off + 8);
    const part = await Promise.all(
      chunk.map(async (date) => {
        try {
          const j = await fetchJSON(`${baseUrl}/api/agents/daily-grid`, {
            method: 'POST',
            headers: h,
            body: JSON.stringify({
              date,
              currentLat: cLat,
              currentLng: cLng,
              timezoneOffset: tz,
              natal_lagna_sign_index,
            }),
          }, `daily-grid ${date}`);
          return j;
        } catch {
          return null;
        }
      }),
    );
    gridResults.push(...part);
  }

  const forecastNew: DayInt[] = gridResults.map((r, i) => {
    const date = dateRange[i];
    const raw = r as Record<string, unknown> | null;
    if (!raw) {
      return {
        date,
        panchang: {},
        rahu_kaal: { start: '', end: '' },
        day_score: 50,
        slots: Array.from({ length: 18 }, (_, si) => ({
          slot_index: si,
          display_label: `${String(6 + si).padStart(2, '0')}:00–${String(7 + si).padStart(2, '0')}:00`,
          dominant_hora: 'Moon',
          dominant_choghadiya: 'Chal',
          transit_lagna: '',
          transit_lagna_house: 1,
          is_rahu_kaal: false,
          score: 50,
        })),
      };
    }
    const slots = (raw.slots as Array<Record<string, unknown>> | undefined) ?? [];
    const rahu = (raw.rahu_kaal as { start?: string; end?: string }) ?? {};
    return {
      date: String(raw.date ?? date),
      panchang: (raw.panchang as Record<string, unknown>) ?? {},
      rahu_kaal: { start: rahu.start ?? '', end: rahu.end ?? '' },
      day_score: typeof raw.day_score === 'number' ? raw.day_score : 50,
      planet_positions: raw.planet_positions,
      slots: slots.map((s, si) => ({
        slot_index: typeof s.slot_index === 'number' ? s.slot_index : si,
        display_label: String(s.display_label ?? '06:00–07:00'),
        dominant_hora: String(s.dominant_hora ?? s.hora_ruler ?? 'Sun'),
        dominant_choghadiya: String(s.dominant_choghadiya ?? s.choghadiya ?? 'Shubh'),
        transit_lagna: String(s.transit_lagna ?? 'Aries'),
        transit_lagna_house: typeof s.transit_lagna_house === 'number' ? s.transit_lagna_house : 1,
        is_rahu_kaal: Boolean(s.is_rahu_kaal),
        score: typeof s.score === 'number' ? s.score : 50,
      })),
    };
  });

  // Hourly commentary in batches (max 8 days per LLM call to stay within latency)
  for (let off = 0; off < forecastNew.length; off += 8) {
    const slice = forecastNew.slice(off, off + 8);
    const payload = {
      lagnaSign: lagna,
      mahadasha: md,
      antardasha: ad,
      days: slice.map((d, j) => ({
        dayIndex: off + j,
        date: d.date,
        planet_positions: d.planet_positions,
        panchang: d.panchang,
        rahu_kaal: d.rahu_kaal,
        slots: d.slots,
      })),
    };
    try {
      const batch = await fetchJSON(`${baseUrl}/api/commentary/hourly-batch`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify(payload),
      }, 'hourly-batch') as { days?: Array<{ dayIndex?: number; slots?: Array<{ slot_index?: number; commentary?: string }> }> };

      (batch.days ?? []).forEach((bd) => {
        const day = forecastNew[bd.dayIndex ?? -1];
        if (!day) return;
        (bd.slots ?? []).forEach((hs) => {
          const slot = day.slots.find((s) => s.slot_index === hs.slot_index);
          if (slot && hs.commentary) {
            slot.commentary = hs.commentary;
            const first = hs.commentary.split('.')[0]?.trim();
            slot.commentary_short = first ? `${first}.` : '';
          }
        });
      });
    } catch (e) {
      console.error('[extendMonthly] hourly-batch failed:', e);
    }
  }

  const v2Enabled = isV2GuidanceEnabled();

  const newReportDays = forecastNew.map((d) => {
    const mappedSlots = d.slots.map((s) => {
      const slotScore = s.score ?? 50;
      const isRk = s.is_rahu_kaal ?? false;
      const horaPlanet = s.dominant_hora ?? 'Moon';
      const chog = s.dominant_choghadiya ?? 'Chal';
      const guidanceV2 = v2Enabled
        ? buildSlotGuidance({
            score: slotScore,
            hora_planet: horaPlanet,
            choghadiya: chog,
            transit_lagna_house: s.transit_lagna_house ?? 1,
            is_rahu_kaal: isRk,
            display_label: s.display_label,
          })
        : undefined;
      const fallbackCommentary = guidanceV2?.summary_plain ?? `${horaPlanet} hora. Score ${slotScore}.`;
      return {
        ...s,
        hora_planet: horaPlanet,
        hora_planet_symbol: PLANET_SYMBOLS[horaPlanet] ?? '☽',
        choghadiya: chog,
        choghadiya_quality: 'Neutral' as const,
        commentary: (s.commentary ?? '').trim() || fallbackCommentary,
        commentary_short:
          (s.commentary_short ?? '').trim() ||
          ((s.commentary ?? '').split('.')[0] + '.') ||
          '—',
        score: slotScore,
        label: toLabel(slotScore, isRk),
        ...(guidanceV2 ? { guidance_v2: guidanceV2 } : {}),
      };
    });

    const briefingV2 = v2Enabled
      ? buildDayBriefing({
          date: d.date,
          day_score: d.day_score,
          panchang: d.panchang ?? {},
          slots: mappedSlots.map((s) => ({
            slot_index: s.slot_index,
            score: s.score,
            is_rahu_kaal: s.is_rahu_kaal,
            hora_planet: s.hora_planet ?? s.dominant_hora,
            choghadiya: s.choghadiya ?? s.dominant_choghadiya,
            display_label: s.display_label,
            guidance: s.guidance_v2,
          })),
        })
      : undefined;

    return {
      date: d.date,
      day_label: formatDayLabel(d.date),
      day_score: d.day_score,
      day_label_tier: getDayOutcomeTier(d.day_score ?? 50).tier,
      day_theme: `Day score ${d.day_score}.`,
      overview:
        `Day score ${d.day_score}. Use hora and choghadiya to time activities — extended Monthly window.`,
      panchang: d.panchang ?? {},
      rahu_kaal: d.rahu_kaal?.start
        ? { start: d.rahu_kaal.start.slice(0, 5), end: d.rahu_kaal.end.slice(0, 5) }
        : null,
      slots: mappedSlots,
      peak_count: mappedSlots.filter((s) => s.score >= 75 && !s.is_rahu_kaal).length,
      caution_count: mappedSlots.filter((s) => s.score < 45 || s.is_rahu_kaal).length,
      ...(briefingV2 ? { briefing_v2: briefingV2 } : {}),
    };
  });

  const merged: ReportData = {
    ...reportData!,
    report_type: 'monthly',
    days: [...existingDays, ...newReportDays] as ReportData['days'],
  };

  const { error: upErr } = await db
    .from('reports')
    .update({
      report_data: merged as unknown as Record<string, unknown>,
      plan_type: 'monthly',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (upErr) {
    return { ok: false, message: upErr.message };
  }

  return { ok: true, message: 'Extended to 30 days' };
}
