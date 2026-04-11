/**
 * PDF Adapter — transforms canonical ReportData into PdfReportPayload.
 *
 * The PDF route should consume the output of this adapter, not build
 * its own parallel payload shape. This eliminates schema drift between
 * the web view and the PDF.
 */

import type { ReportData } from '@/lib/agents/types';
import type { PdfReportPayload } from '@/lib/schema/dtos';
import { getCanonicalScoreLabel } from '@/lib/guidance/labels';
import type { SlotGuidanceV2, DayBriefingV2 } from '@/lib/guidance/types';

interface ReportMetadata {
  name: string;
  date: string;
  time: string;
  city: string;
}

export function reportDataToPdfPayload(
  report: ReportData,
  meta: ReportMetadata,
): PdfReportPayload {
  const natChart = report.nativity?.natal_chart;
  const lagna = natChart?.lagna ?? '—';
  const mahadasha = natChart?.current_dasha?.mahadasha;
  const antardasha = natChart?.current_dasha?.antardasha;

  return {
    name: meta.name,
    date: meta.date,
    time: meta.time,
    city: meta.city,
    lagna,
    mahadasha,
    antardasha,
    nativity_summary: report.nativity?.lagna_analysis ?? '',
    monthly: (report.months ?? []).map((m) => ({
      month: m.month,
      commentary: m.commentary,
      score: m.score,
    })),
    weekly: (report.weeks ?? []).map((w) => ({
      week_label: w.week_label,
      commentary: w.commentary,
      score: w.score,
    })),
    days: (report.days ?? []).map((day) => {
      const dayAny = day as unknown as Record<string, unknown>;
      const briefing = dayAny.briefing_v2 as DayBriefingV2 | undefined;

      return {
        date: day.date,
        day_score: day.day_score,
        day_label_tier: getCanonicalScoreLabel(day.day_score),
        day_theme: day.day_theme ?? '',
        overview_short: truncateOverview(day.overview ?? '', 200),
        panchang: day.panchang,
        rahu_kaal: day.rahu_kaal,
        briefing: briefing,
        slots: (day.slots ?? []).map((s) => {
          const slotAny = s as unknown as Record<string, unknown>;
          const guidanceV2 = slotAny.guidance_v2 as SlotGuidanceV2 | undefined;
          return {
            display_label: s.display_label,
            hora_planet: s.hora_planet,
            choghadiya: s.choghadiya,
            score: s.score,
            label: getCanonicalScoreLabel(s.score, s.is_rahu_kaal),
            is_rahu_kaal: s.is_rahu_kaal,
            commentary_short: s.commentary_short || (s.commentary ?? '').split('.')[0] + '.',
            guidance: guidanceV2,
          };
        }),
      };
    }),
    period_synthesis: report.synthesis?.opening_paragraph ?? '',
  };
}

function truncateOverview(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.7 ? truncated.slice(0, lastSpace) : truncated) + '…';
}
