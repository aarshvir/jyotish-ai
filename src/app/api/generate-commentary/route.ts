// DEPRECATED: replaced by /api/commentary/* routes (daily-overviews, hourly-day, months-first, months-second, weeks-synthesis, nativity-text).
// This route is no longer called from the frontend.
export const maxDuration = 800;
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { safeParseJson } from '@/lib/utils/safeJson';
import { validateReportData } from '@/lib/validation/reportValidation';
import type { ReportData, HoraSlot, DayForecast, RatingLabel } from '@/lib/agents/types';
import {
  SIGNS,
  buildLagnaContext,
  buildMacroSystemPrompt,
  buildMicroSystemPrompt,
} from '@/lib/agents/lagnaContext';

/** GET with ?test=1 builds a minimal ReportData and returns validation result for acceptance check. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('test') !== '1') {
    return NextResponse.json({ error: 'Use POST for commentary generation' }, { status: 405 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const mockNatalChart = { lagna: 'Cancer', planets: { Moon: { sign: 'Leo' } }, moon_nakshatra: 'Ashlesha', current_dasha: { mahadasha: 'Rahu', antardasha: 'Mercury' } };
  const mockNativity = {};
  const mockForecast = {
    days: Array.from({ length: 3 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const date = d.toISOString().slice(0, 10);
      const scores = [72, 58, 65];
      return {
        date,
        panchang: { tithi: 'Shukla', nakshatra: 'Ashlesha', yoga: 'Siddhi', karana: 'Bava', sunrise: '06:30:00', sunset: '18:30:00', moon_sign: 'Leo', day_ruler: 'Sun' },
        rahu_kaal: { start_time: '15:00:00', end_time: '16:30:00' },
        rating: {
          day_score: scores[i],
          all_slots: Array.from({ length: 18 }, (_, si) => ({
            start_time: `${String(6 + si).padStart(2, '0')}:00:00`,
            end_time: `${String(7 + si).padStart(2, '0')}:00:00`,
            hora_ruler: ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'][si % 7],
            choghadiya: ['Amrit', 'Shubh', 'Labh', 'Chal', 'Udveg', 'Rog', 'Kaal'][si % 7],
            choghadiya_quality: 'Good',
            rating: 60 + (si % 20),
            is_rahu_kaal: si === 9,
            transit_lagna: 'Capricorn',
            transit_lagna_house: 10,
          })),
        },
      };
    }),
  };
  const mockCommentary = {
    nativity_summary: { lagna_analysis: nativityFallback('Cancer', 'Leo', 'Rahu/Mercury'), current_dasha_interpretation: 'Rahu/Mercury dasha.', key_yogas: [], functional_benefics: [], functional_malefics: [] },
    monthly: Array.from({ length: 12 }, (_, i) => ({ month: `Month ${i + 1}`, score: 65, overall_score: 65, commentary: 'Monthly overview.', theme: '', key_transits: [], weekly_scores: [65, 65, 65, 65] })),
    weekly: Array.from({ length: 6 }, (_, i) => ({ week_label: `Week ${i + 1}`, week_start: today, score: 65, theme: '', commentary: 'Weekly arc.', daily_scores: Array(7).fill(65), moon_journey: [], peak_days_count: 2, caution_days_count: 1 })),
    daily: [],
    period_synthesis: { opening_paragraph: synthesisFallback(mockForecast.days.map((d: any) => ({ date: d.date, score: d.rating?.day_score }))), strategic_windows: [], caution_dates: [], domain_priorities: { career: 'Career.', money: 'Money.', health: 'Health.', relationships: 'Relations.' }, closing_paragraph: 'Closing.' },
  };
  const reportData = buildReportData(mockNatalChart, mockNativity, mockForecast, mockCommentary, 'test-report', '7day', '+00:00');
  const validationErrors = validateReportData(reportData);
  const sampleSlot = reportData.days[0]?.slots?.[0];
  const sampleSynthesis = reportData.synthesis;
  return NextResponse.json({
    validationOutput: validationErrors,
    validationPassed: validationErrors.length === 0,
    sampleSlot: sampleSlot ? { commentary: sampleSlot.commentary, commentary_short: sampleSlot.commentary_short } : null,
    sampleSynthesis: sampleSynthesis ? { opening_paragraph: sampleSynthesis.opening_paragraph } : null,
  });
}

let anthropic: Anthropic | null = null;
try {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} catch (e) {
  console.error('Anthropic SDK init failed in generate-commentary:', e);
}

// HORA_LORDSHIP, MACRO_SYSTEM_PROMPT, and MICRO_SYSTEM_PROMPT are now generated
// dynamically from buildLagnaContext() / buildMacroSystemPrompt() / buildMicroSystemPrompt()
// in lagnaContext.ts — supports all 12 lagnas instead of only Cancer.

function extractTextContent(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

// ── Deterministic fallback generators (no blank, no "—", no "unavailable") ──
function slotFallback(slot: { hora?: string; chog?: string; score?: number; rk?: boolean }): string {
  const hora = slot.hora || 'Planet';
  const chog = slot.chog || 'Choghadiya';
  const score = slot.score ?? 50;
  const rk = slot.rk ?? false;
  const quality = score >= 70 ? 'favourable' : score >= 50 ? 'moderate' : 'challenging';
  const rkNote = rk ? ' Rahu Kaal is active; avoid new beginnings and important decisions during this window.' : '';
  return `${hora} hora with ${chog} choghadiya yields a ${quality} score of ${score}.${rkNote} Use this period according to the hora lord's functional role for your lagna.`;
}

const MAX_SHORT = 120;

function slotFallbackShort(slot: { hora?: string; chog?: string; score?: number; rk?: boolean }): string {
  const hora = slot.hora || 'Planet';
  const chog = slot.chog || 'Choghadiya';
  const score = slot.score ?? 50;
  const rk = slot.rk ?? false;
  const rkNote = rk ? ' Rahu Kaal.' : '';
  return `${hora} hora, ${chog} - score ${score}.${rkNote}`.slice(0, MAX_SHORT);
}

function deriveCommentaryShort(commentary: string, shortFallback: string): string {
  const trimmed = (commentary || '').trim();
  if (!trimmed) return shortFallback;
  const firstSentence = trimmed.split(/[.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length <= MAX_SHORT) return firstSentence;
  if (firstSentence && firstSentence.length > MAX_SHORT) return firstSentence.slice(0, MAX_SHORT - 3) + '...';
  return trimmed.length <= MAX_SHORT ? trimmed : trimmed.slice(0, MAX_SHORT - 3) + '...';
}

function dayFallback(dayScore: number, panchang: Record<string, string>): string {
  const tithi = panchang?.tithi || 'today';
  const nakshatra = panchang?.nakshatra || 'the lunar mansion';
  const moonSign = panchang?.moon_sign || 'Moon';
  const dayRuler = panchang?.day_ruler || 'day lord';
  const quality = dayScore >= 70 ? 'strong' : dayScore >= 50 ? 'moderate' : 'challenging';
  return `Day score ${dayScore} reflects a ${quality} energy. Tithi ${tithi} and nakshatra ${nakshatra} activate lunar themes. Moon in ${moonSign} with ${dayRuler} as day ruler influences the overall tone. Plan key activities during higher-scoring horas.`;
}

function synthesisFallback(days: Array<{ date?: string; score?: number }>): string {
  if (!days?.length) return 'This forecast period combines transits, dasha activations, and hora patterns. Prioritise high-score windows for important work and avoid Rahu Kaal for new beginnings.';
  const withScores = days.map((d) => ({ date: d.date || '', score: d.score ?? 50 })).filter((d) => d.date);
  if (withScores.length === 0) return 'This forecast period combines transits, dasha activations, and hora patterns. Use hora and choghadiya to time important activities within each day.';
  const byScoreDesc = [...withScores].sort((a, b) => b.score - a.score);
  const byScoreAsc = [...withScores].sort((a, b) => a.score - b.score);
  const highScore = byScoreDesc[0]?.score ?? 50;
  const lowScore = byScoreAsc[0]?.score ?? 50;
  const highCandidates = withScores.filter((d) => d.score === highScore).sort((a, b) => a.date.localeCompare(b.date));
  const lowCandidates = withScores.filter((d) => d.score === lowScore).sort((a, b) => a.date.localeCompare(b.date));
  const highDate = highCandidates[0]?.date ?? '';
  const lowDate = lowCandidates[0]?.date ?? '';
  const allTied = highScore === lowScore;
  if (allTied) {
    return `This period shows consistent energy (score ${highScore}) across days. Use hora and choghadiya to time important activities within each day.`;
  }
  return `This period shows variation across days. Strongest energy around ${highDate} (score ${highScore}); exercise caution around ${lowDate} (score ${lowScore}). Use hora and choghadiya to time important activities within each day.`;
}

function nativityFallback(lagna: string, moonSign: string, dasha: string): string {
  return `${lagna} lagna native with Moon in ${moonSign}. Current dasha period ${dasha} shapes the dominant themes. The lagna lord governs identity and vitality; functional benefics and malefics for this lagna influence daily outcomes.`;
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄',
};

function toRatingLabel(score: number, isRahuKaal: boolean): RatingLabel {
  if (isRahuKaal) return 'Avoid';
  if (score >= 85) return 'Peak';
  if (score >= 75) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 55) return 'Neutral';
  if (score >= 45) return 'Caution';
  if (score >= 35) return 'Difficult';
  return 'Avoid';
}

function formatDayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00Z');
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[d.getUTCDay()]} · ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
  } catch {
    return dateStr;
  }
}

function buildReportData(
  natalChart: any,
  nativity: any,
  forecast: any,
  commentary: any,
  reportId = 'test-report',
  reportType = '7day',
  tzOffset = '+00:00'
): ReportData {
  const ns = commentary?.nativity_summary ?? {};
  const nc = natalChart ?? {};
  const lagna = nc.lagna ?? 'Unknown';
  const lagnaAnalysis = (ns.lagna_analysis ?? '').trim() || nativityFallback(lagna, nc.planets?.Moon?.sign ?? 'Unknown', `${nc.current_dasha?.mahadasha ?? '?'}/${nc.current_dasha?.antardasha ?? '?'}`);

  const months = (commentary?.monthly ?? []).slice(0, 12);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const today = new Date();
  const monthsData = Array.from({ length: 12 }, (_, i) => {
    const m = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const label = `${monthNames[m.getMonth()]} ${m.getFullYear()}`;
    const ex = months[i];
    return {
      month: ex?.month ?? label,
      score: ex?.score ?? ex?.overall_score ?? 65,
      overall_score: ex?.overall_score ?? ex?.score ?? 65,
      domain_scores: ex?.domain_scores ?? { career: 65, money: 65, health: 65, relationships: 65 },
      theme: (ex?.theme ?? '').trim() || `${label} energy arc.`,
      commentary: (ex?.commentary ?? '').trim() || `Monthly overview for ${label}.`,
      key_transits: ex?.key_transits ?? [],
      weekly_scores: ex?.weekly_scores ?? [65, 65, 65, 65],
    };
  });

  const weeks = (commentary?.weekly ?? []).slice(0, 6);
  const weeksData = Array.from({ length: 6 }, (_, i) => {
    const ex = weeks[i];
    return {
      week_label: (ex?.week_label ?? '').trim() || `Week ${i + 1} of 6`,
      week_start: ex?.week_start ?? '',
      score: ex?.score ?? 65,
      theme: (ex?.theme ?? '').trim() || `Week ${i + 1} themes.`,
      commentary: (ex?.commentary ?? '').trim() || `Weekly energy arc.`,
      daily_scores: ex?.daily_scores ?? [65, 65, 65, 65, 65, 65, 65],
      moon_journey: ex?.moon_journey ?? [],
      peak_days_count: ex?.peak_days_count ?? 2,
      caution_days_count: ex?.caution_days_count ?? 1,
    };
  });

  const forecastDays = forecast?.days ?? [];
  const commentaryDaily = commentary?.daily ?? [];
  const daysData: DayForecast[] = forecastDays.slice(0, 7).map((fd: any, i: number) => {
    const cd = commentaryDaily.find((c: any) => c?.date === fd?.date) ?? commentaryDaily[i] ?? {};
    const slots = fd?.rating?.all_slots ?? [];
    const commentaryHours = cd?.hours ?? [];
    const dayScore = fd?.rating?.day_score ?? cd?.day_score ?? 50;
    const panchang = cd?.panchang ?? fd?.panchang ?? { tithi: '', nakshatra: '', yoga: '', karana: '', sunrise: '', sunset: '', moon_sign: '', day_ruler: '' };
    const rk = fd?.rahu_kaal ?? cd?.rahu_kaal ?? {};
    const date = fd?.date ?? '';

    const horaSlots: HoraSlot[] = slots.length >= 18 ? slots.map((s: any, slotIdx: number) => {
      const match = commentaryHours.find((ch: any) => ch.slot_index === slotIdx || (ch.time ?? '').slice(0, 5) === (s.start_time ?? '').slice(0, 5));
      const st = (s.start_time ?? '06:00:00').slice(0, 8);
      const et = (s.end_time ?? '07:00:00').slice(0, 8);
      const startIso = `${date}T${st}${tzOffset}`;
      const endIso = `${date}T${et}${tzOffset}`;
      const [sh, sm] = st.split(':').map(Number);
      const [eh, em] = et.split(':').map(Number);
      const startMin = (sh ?? 0) * 60 + (sm ?? 0);
      const endMin = (eh ?? 0) * 60 + (em ?? 0);
      const midMin = (startMin + endMin) / 2;
      const mh = Math.floor(midMin / 60);
      const mm = Math.round(midMin % 60);
      const midIso = `${date}T${String(mh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00${tzOffset}`;
      const displayLabel = `${st.slice(0, 5)}–${et.slice(0, 5)}`;
      const rawCommentary = match?.commentary ?? '';
      const slotData = { hora: s.hora_ruler, chog: s.choghadiya, score: s.rating ?? 50, rk: s.is_rahu_kaal };
      const fb = slotFallback(slotData);
      const commentaryText = (rawCommentary ?? '').trim() || fb;
      const commentaryShort = deriveCommentaryShort(rawCommentary, slotFallbackShort(slotData));
      return {
        slot_index: slotIdx,
        display_label: displayLabel,
        start_iso: startIso,
        end_iso: endIso,
        midpoint_iso: midIso,
        hora_planet: s.hora_ruler ?? 'Moon',
        hora_planet_symbol: PLANET_SYMBOLS[s.hora_ruler] ?? '☽',
        choghadiya: s.choghadiya ?? 'Chal',
        choghadiya_quality: s.choghadiya_quality ?? 'Neutral',
        is_rahu_kaal: s.is_rahu_kaal ?? false,
        transit_lagna: s.transit_lagna ?? '',
        transit_lagna_house: s.transit_lagna_house ?? 1,
        score: s.rating ?? 50,
        label: toRatingLabel(s.rating ?? 50, s.is_rahu_kaal ?? false),
        commentary: commentaryText,
        commentary_short: commentaryShort,
      };
    }) : Array.from({ length: 18 }, (_, slotIdx) => {
      const startH = 6 + slotIdx;
      const endH = 7 + slotIdx;
      const st = `${String(startH).padStart(2, '0')}:00:00`;
      const et = `${String(endH).padStart(2, '0')}:00:00`;
      const fb = slotFallback({ hora: 'Moon', chog: 'Chal', score: 50, rk: false });
      return {
        slot_index: slotIdx,
        display_label: `${st.slice(0, 5)}–${et.slice(0, 5)}`,
        start_iso: `${date}T${st}${tzOffset}`,
        end_iso: `${date}T${et}${tzOffset}`,
        midpoint_iso: `${date}T${st.slice(0, 5)}:30${tzOffset}`,
        hora_planet: 'Moon',
        hora_planet_symbol: '☽',
        choghadiya: 'Chal',
        choghadiya_quality: 'Neutral',
        is_rahu_kaal: false,
        transit_lagna: '',
        transit_lagna_house: 1,
        score: 50,
        label: 'Neutral' as RatingLabel,
        commentary: fb,
        commentary_short: slotFallbackShort({ hora: 'Moon', chog: 'Chal', score: 50, rk: false }),
      };
    });

    const overviewFallback = dayFallback(dayScore, panchang);
    const overview = (cd?.day_overview ?? '').trim() || overviewFallback;
    const peakCount = horaSlots.filter((sl) => sl.score >= 75 && !sl.is_rahu_kaal).length;
    const cautionCount = horaSlots.filter((sl) => sl.score < 45 || sl.is_rahu_kaal).length;

    return {
      date,
      day_label: formatDayLabel(date),
      day_score: dayScore,
      day_label_tier: toRatingLabel(dayScore, false),
      day_theme: (cd?.day_theme ?? '').trim() || `Day score ${dayScore}.`,
      overview,
      panchang,
      rahu_kaal: rk?.start_time || rk?.start ? { start: rk.start_time ?? rk.start ?? '', end: rk.end_time ?? rk.end ?? '' } : null,
      slots: horaSlots,
      peak_count: peakCount,
      caution_count: cautionCount,
    };
  });

  const ps = commentary?.period_synthesis ?? {};
  const synthesisFallbackText = synthesisFallback(daysData.map((d) => ({ date: d.date, score: d.day_score })));
  const synthesis = {
    opening_paragraph: (ps?.opening_paragraph ?? '').trim() || synthesisFallbackText,
    strategic_windows: ps?.strategic_windows ?? [],
    caution_dates: ps?.caution_dates ?? [],
    domain_priorities: ps?.domain_priorities ?? {
      career: 'Focus on Yogakaraka and 10th house activations.',
      money: '2nd and 11th house transits influence gains.',
      health: 'Lagna lord and 6th house themes.',
      relationships: '7th house and Badhaka themes.',
    },
    closing_paragraph: (ps?.closing_paragraph ?? '').trim() || synthesisFallbackText,
  };

  return {
    report_id: reportId,
    report_type: reportType,
    generated_at: new Date().toISOString().slice(0, 10),
    nativity: {
      natal_chart: natalChart,
      lagna_analysis: lagnaAnalysis,
      key_yogas: ns?.key_yogas ?? [],
      functional_benefics: ns?.functional_benefics ?? [],
      functional_malefics: ns?.functional_malefics ?? [],
      current_dasha_interpretation: (ns?.current_dasha_interpretation ?? '').trim() || lagnaAnalysis,
    },
    months: monthsData,
    weeks: weeksData,
    days: daysData,
    synthesis,
  };
}

// For MACRO: no extended thinking — avoids streaming requirement and rate limits
async function callClaudeMacro(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  retries = 2
) {
  if (!anthropic) throw new Error('Anthropic SDK not initialized — check ANTHROPIC_API_KEY');

  let lastError: any;
  const delays = [3000, 6000];

  for (let i = 0; i < retries; i++) {
    try {
      console.log('[Commentary] Starting macro call...');
      console.log(`Macro Claude call attempt ${i + 1}/${retries}`);
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      console.log('[DIAG-3] Macro call returned');
      console.log('[DIAG-3] Content blocks:', response?.content?.length);
      console.log('[DIAG-3] Block types:', response?.content?.map((b: any) => b.type).join(','));
      console.log('[Commentary] Macro call returned, content blocks:', response.content?.length ?? 0);
      const text = extractTextContent(response);
      console.log('[MACRO] Text length:', text.length);
      console.log('[DIAG-4] Extracted macro text length:', text?.length || 0);
      console.log('[DIAG-4] First 200 chars:', text?.substring(0, 200));
      console.log('[Commentary] Extracted text length:', text.length);
      console.log(`Macro response: ${text.length} chars, stop: ${response.stop_reason}`);
      if (text.length > 0) {
        const parsed = safeParseJson(text);
        console.log('[DIAG-5] Macro parse result keys:', parsed ? Object.keys(parsed) : 'FAILED/NULL');
        console.log('[DIAG-5] months length:', (parsed as any)?.months?.length ?? (parsed as any)?.monthly?.length ?? 'MISSING');
        console.log('[DIAG-5] weeks length:', (parsed as any)?.weeks?.length ?? (parsed as any)?.weekly?.length ?? 'MISSING');
        console.log('[DIAG-5] synthesis exists:', !!((parsed as any)?.period_synthesis ?? (parsed as any)?.synthesis));
        console.log('[Commentary] Parsed JSON keys:', parsed ? Object.keys(parsed) : 'null');
        return parsed;
      }
    } catch (error: any) {
      lastError = error;
      const status = error?.status;
      if (status === 401) throw new Error('Invalid Anthropic API key');
      if (status === 400) { console.error('Anthropic 400:', error?.message); throw error; }
      if (status === 429 || status === 529) {
        const delay = status === 529 ? 5000 : delays[Math.min(i, delays.length - 1)];
        console.warn(`Anthropic ${status}, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      console.error(`Macro Claude call failed (attempt ${i + 1}):`, error?.message || error);
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delays[Math.min(i, delays.length - 1)]));
    }
  }
  throw lastError || new Error('Macro call failed after retries');
}

// For MICRO: NO extended thinking — faster and more reliable for structured JSON
async function callClaudeMicro(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  retries = 2
) {
  if (!anthropic) throw new Error('Anthropic SDK not initialized — check ANTHROPIC_API_KEY');

  let lastError: any;
  const delays = [3000, 6000];

  for (let i = 0; i < retries; i++) {
    try {
      console.log('[Commentary] Starting micro call...');
      console.log(`Micro Claude call attempt ${i + 1}/${retries}, max_tokens: ${maxTokens}`);
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      console.log('[Commentary] Micro call returned, content blocks:', response.content?.length ?? 0);
      const text = response.content.find((b) => b.type === 'text')?.text ?? '';
      console.log('[Commentary] Micro extracted text length:', text.length);
      console.log(`Micro response: ${text.length} chars, stop: ${response.stop_reason}`);
      if (text.length > 0) {
        const parsed = safeParseJson(text);
        console.log('[DIAG-7] Micro text length:', text?.length || 0);
        console.log('[DIAG-7] Micro parse result keys:', parsed ? Object.keys(parsed) : 'FAILED/NULL');
        console.log('[DIAG-7] Days in micro result:', (parsed as any)?.days?.length ?? 'MISSING');
        console.log('[Commentary] Micro parsed JSON keys:', parsed ? Object.keys(parsed) : 'null');
        return parsed;
      }
      console.log('[DIAG-7] Micro text length:', 0);
      console.log('[DIAG-7] Micro parse result keys:', 'FAILED/NULL');
      console.log('[DIAG-7] Days in micro result:', 'MISSING');
    } catch (error: any) {
      lastError = error;
      const status = error?.status;
      if (status === 401) throw new Error('Invalid Anthropic API key');
      if (status === 400) { console.error('Anthropic 400 micro:', error?.message); throw error; }
      if (status === 429 || status === 529) {
        const delay = delays[Math.min(i, delays.length - 1)];
        console.warn(`Anthropic ${status} micro, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      console.error(`Micro Claude failed (attempt ${i + 1}):`, error?.message || error);
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delays[Math.min(i, delays.length - 1)]));
    }
  }
  throw lastError || new Error('Micro call failed after retries');
}

const TRANSIT_HOUSE_MEANINGS: Record<number, string> = {
  1:  'Lagna rising — direct personal power, health focus, first-house initiatives',
  2:  '2nd house rising — wealth and speech activated, financial decisions favored',
  3:  '3rd house rising — communication, courage, short travel emphasized',
  4:  '4th house rising — home, mother, emotional comfort emphasized',
  5:  '5th house rising — creativity, speculation, children, intellect peak',
  6:  '6th house rising — service, health challenges, competition activated',
  7:  '7th house rising — partnerships, business deals, one-on-one meetings emphasized',
  8:  '8th house rising — transformation, hidden matters, research; avoid new ventures',
  9:  '9th house rising — fortune, dharma, long travel, spiritual work peak',
  10: '10th house rising — career authority peak, executive actions, public recognition',
  11: '11th house rising — gains, networks, wishes fulfilled, group activities',
  12: '12th house rising — isolation, expenses, spiritual practice, foreign matters',
};

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[Commentary] ANTHROPIC_API_KEY missing');
    return NextResponse.json({ error: 'API key missing' }, { status: 500 });
  }

  let body: any = {};
  try {
    body = await req.json();
    const { natalChart, nativity, forecast, reportType } = body;

    console.log('[DIAG-1] Commentary route hit');
    console.log('[DIAG-1] Body keys:', Object.keys(body));
    console.log('[DIAG-1] ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('[DIAG-1] Report type:', body.reportType);
    console.log('[DIAG-1] Days count:', body.forecast?.days?.length);
    console.log('[DIAG-1] Nativity lagna:', body.nativity?.lagna_sign || body.natalChart?.lagna || 'MISSING');

    console.log('[Commentary] POST body keys:', Object.keys(body), 'days:', forecast?.days?.length);
    console.log('[FIX1] forecastDays length:', body.forecast?.days?.length);
    console.log('[FIX1] lagnaSign:', body.nativity?.lagna_sign || body.natalChart?.lagna?.sign || body.natalChart?.lagna || 'STILL MISSING');

    if (!natalChart || !forecast) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    if (!forecast.days || !Array.isArray(forecast.days) || forecast.days.length === 0) {
      return NextResponse.json({ error: 'Forecast missing days array' }, { status: 400 });
    }

    const lagna = natalChart.lagna || 'Unknown';
    const moonSign = natalChart.planets?.Moon?.sign || 'Unknown';
    const moonNakshatra = natalChart.moon_nakshatra || 'Unknown';
    const currentDasha = natalChart.current_dasha || {};
    const mahadasha = currentDasha.mahadasha || 'Unknown';
    const antardasha = currentDasha.antardasha || 'Unknown';

    // Build dynamic lagna context (works for all 12 lagnas)
    const lagnaContext = buildLagnaContext(lagna);

    // Log all 12 lagnas once per request in development to verify yogakaraka detection
    if (process.env.NODE_ENV === 'development') {
      SIGNS.forEach((sign) => {
        const ctx = buildLagnaContext(sign);
        console.log(
          `[lagnaContext] ${sign.padEnd(12)}: lagnaLord=${ctx.lagnaLord.padEnd(7)} yogakaraka=${(ctx.yogakaraka ?? 'null').padEnd(7)} badhaka=${ctx.badhakaLord}(H${ctx.badhakaHouse})`
        );
      });
    }

    const planetSummary = Object.entries(natalChart.planets || {})
      .map(([name, p]: [string, any]) =>
        `${name}: ${p?.sign || '?'} H${p?.house ?? '?'} ${p?.nakshatra || '?'}${p?.is_retrograde ? ' (R)' : ''}`
      ).join(', ');

    const dailyScores = forecast.days.slice(0, 30).map((day: any) => ({
      date: day.date,
      score: day.rating?.day_score ?? 50,
      tithi: day.panchang?.tithi || '',
      nakshatra: day.panchang?.nakshatra || '',
      moon_sign: day.panchang?.moon_sign || '',
    }));

    const nativityBrief = nativity ? {
      lagna_analysis: (nativity.lagna_analysis || '').slice(0, 300),
      yogas: (nativity.yogas || []).slice(0, 5).map((y: any) => typeof y === 'string' ? y : y?.name || ''),
      functional_benefics: nativity.functional_benefics || [],
      functional_malefics: nativity.functional_malefics || [],
    } : {};

    // ── Dynamic lagna-aware strings for macroPrompt ───────────────────────────
    const lagnaLordDesc = `${lagnaContext.lagnaLord} as lagna lord`;
    const ykNote = lagnaContext.yogakaraka
      ? `${lagnaContext.yogakaraka} as Yogakaraka (rules both kendra H${lagnaContext.horaRoles[lagnaContext.yogakaraka]?.houses.filter(h => h !== 1).join('+H')} and trikona)`
      : `no yogakaraka for ${lagna} lagna — ${lagnaContext.lagnaLord} (lagna lord) is the primary benefic`;
    const lagnaAnalysisInstruction = `200-word analysis covering: ${lagna} lagna rising sign traits, ${lagnaLordDesc}, ${ykNote}, planetary placements and their house activations for this lagna, overall chart strength and life direction under ${mahadasha}-${antardasha} dasha`;

    const mdRole = lagnaContext.horaRoles[mahadasha];
    const adRole = lagnaContext.horaRoles[antardasha];
    const mdHouseRole = mdRole
      ? `${mahadasha} as MD (${mdRole.label}, rules H${mdRole.houses.join('+H')})`
      : `${mahadasha} as MD`;
    const adHouseRole = adRole
      ? `${antardasha} as AD (${adRole.label}, rules H${adRole.houses.join('+H')})`
      : `${antardasha} as AD`;
    const dashaInstruction = `150-word analysis: ${mdHouseRole} — house themes amplified obsessively, specific domains activated; ${adHouseRole} — sub-period coloring and modification; practical guidance for what this native should prioritize during this exact period`;

    const keyYogasInstruction = [
      lagnaContext.yogakaraka
        ? `Yogakaraka Raja Yoga — ${lagnaContext.yogakaraka} rules both kendra and trikona (H${lagnaContext.horaRoles[lagnaContext.yogakaraka]?.houses.join('+H')}), supreme life yoga for ${lagna} lagna`
        : null,
      `Lagna lord strength — ${lagnaContext.lagnaLord} placement and dignity determines chart vitality`,
      `Dasha activation yoga — ${mahadasha} period interacting with natal ${mahadasha} house placement`,
      `Any Viparita Raja Yoga if dusthana lords (H6/H8/H12 lords) occupy other dusthana houses`,
    ].filter(Boolean) as string[];

    const funcBeneficsDescList = lagnaContext.functionalBenefics.map((p) => {
      const role = lagnaContext.horaRoles[p];
      return `${p} — ${role?.label ?? ''}, H${role?.houses.join('+H') ?? '?'} lord`;
    });
    const funcMaleficsDescList = lagnaContext.functionalMalefics.map((p) => {
      const role = lagnaContext.horaRoles[p];
      return `${p} — ${role?.label ?? ''}, H${role?.houses.join('+H') ?? '?'} lord`;
    });

    const careerPlanet = lagnaContext.yogakaraka ?? lagnaContext.lagnaLord;
    const careerHouses = lagnaContext.horaRoles[careerPlanet]?.houses.join('+H') ?? '10';
    const h2Lord = Object.values(lagnaContext.horaRoles).find((r) => r.houses.includes(2))?.planet ?? '2nd lord';
    const h11Lord = Object.values(lagnaContext.horaRoles).find((r) => r.houses.includes(11))?.planet ?? '11th lord';

    // ── CALL 1: MACRO (nativity_summary + monthly + weekly + period_synthesis) ──
    const macroPrompt = `Generate macro commentary for this native. Return ONLY valid JSON.

Native: ${lagna} Lagna, Moon in ${moonSign}/${moonNakshatra}
Current dasha: ${mahadasha}/${antardasha}
Planets: ${planetSummary}
Nativity brief: ${JSON.stringify(nativityBrief)}
30-day daily scores: ${JSON.stringify(dailyScores)}

Return this EXACT JSON structure (no extra fields, no markdown):
{
  "nativity_summary": {
    "lagna_analysis": "${lagnaAnalysisInstruction}",
    "current_dasha_interpretation": "${dashaInstruction}",
    "key_yogas": ${JSON.stringify(keyYogasInstruction)},
    "functional_benefics": ${JSON.stringify(funcBeneficsDescList)},
    "functional_malefics": ${JSON.stringify(funcMaleficsDescList)}
  },
  "monthly": [
    {
      "month": "Month YYYY",
      "score": 72,
      "overall_score": 72,
      "career_score": 74,
      "money_score": 70,
      "health_score": 71,
      "love_score": 73,
      "theme": "One compelling italic theme line",
      "key_transits": ["Transit description — house activation for ${lagna} Lagna"],
      "commentary": "100-word paragraph covering: main transit activations for ${lagna} Lagna, energy arc, and key dates with astrological reasons",
      "weekly_scores": [68, 72, 75, 74]
    }
  ],
  "weekly": [
    {
      "week_label": "Mon DD – Mon DD",
      "week_start": "YYYY-MM-DD",
      "score": 71,
      "theme": "One compelling theme line",
      "commentary": "80-word paragraph covering: energy arc across 7 days, Moon nakshatra progression for ${lagna}, standout high and low days with astrological reasons",
      "daily_scores": [49, 63, 83, 60, 66, 75, 70],
      "moon_journey": ["Cancer", "Cancer", "Leo", "Leo", "Virgo", "Virgo", "Libra"],
      "peak_days_count": 2,
      "caution_days_count": 1
    }
  ],
  "period_synthesis": {
    "opening_paragraph": "150-word overview of dominant energy patterns for this forecast period and what this native should prioritize",
    "strategic_windows": [
      {"date": "YYYY-MM-DD", "nakshatra": "name", "score": 83, "reason": "Specific astrological reason why this date is powerful for ${lagna}"}
    ],
    "caution_dates": [
      {"date": "YYYY-MM-DD", "nakshatra": "name", "score": 35, "reason": "Specific astrological reason why caution is needed"}
    ],
    "domain_priorities": {
      "career": "50-word career guidance referencing ${careerPlanet} (${lagnaContext.yogakaraka ? 'Yogakaraka' : 'lagna lord'}) H${careerHouses} themes and current ${mahadasha} dasha activation",
      "money": "50-word financial guidance referencing 2nd (${h2Lord}) and 11th (${h11Lord}) house activations and their current transit strengths",
      "health": "50-word health guidance referencing ${lagnaContext.lagnaLord} as lagna lord (vitality, constitution) and 6th house themes (health challenges, service demands)",
      "relationships": "50-word relationship guidance referencing 7th house themes and ${lagnaContext.badhakaLord} as ${lagna} Badhaka lord (H${lagnaContext.badhakaHouse}) creating relational obstacles"
    },
    "closing_paragraph": "100-word spiritual and philosophical synthesis of this forecast period's life lesson"
  }
}`;

    // ── CALL 2: MICRO (daily + hourly) — NO extended thinking for speed and reliability ──
    const PLANET_SYM: Record<string, string> = {
      Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄',
    };

    // Build slot data for days 1-3 with slot indices
    const slimDay = (day: any, dayIdx: number) => {
      const rating = day.rating || {};
      const slots = (rating.all_slots || []).map((s: any, slotIdx: number) => {
        const hora = s.hora_ruler || '';
        const role = lagnaContext.horaRoles[hora];
        const horaLordship = role ? role.description : `${hora} hora`;
        return {
          idx: slotIdx,
          time: s.start_time,
          end_time: s.end_time,
          hora,
          chog: s.choghadiya,
          score: s.rating,
          rk: s.is_rahu_kaal ? true : undefined,
          lordship: horaLordship,
          hora_quality: role?.quality,
          hora_modifier: role?.modifier,
          hora_directive: role?.directive,
          transit_lagna: s.transit_lagna,
          transit_lagna_house: s.transit_lagna_house,
        };
      });
      return {
        dayIdx,
        date: day.date,
        score: rating.day_score ?? 50,
        panchang: {
          tithi: day.panchang?.tithi || '',
          nakshatra: day.panchang?.nakshatra || '',
          yoga: day.panchang?.yoga || '',
          karana: day.panchang?.karana || '',
          moon_sign: day.panchang?.moon_sign || '',
          sunrise: day.panchang?.sunrise || '',
          day_ruler: day.panchang?.day_ruler || '',
        },
        rahu_kaal: day.rahu_kaal || {},
        slots,
      };
    };

    const first3Days = forecast.days.slice(0, 3).map((d: any, i: number) => slimDay(d, i));
    const days4to7 = forecast.days.slice(3, 7).map((d: any, i: number) => ({
      dayIdx: i + 3,
      date: d.date,
      score: d.rating?.day_score ?? 50,
      panchang: d.panchang || {},
    }));

    // For transit lagna approximation, include sign progression info
    const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const lagnaIdx = signs.indexOf(lagna);
    const transitHouseMeanings = Object.entries(TRANSIT_HOUSE_MEANINGS).map(
      ([h, meaning]) => `H${h}: ${meaning}`
    ).join('\n');

    const microPrompt = `Generate daily and hourly commentary for 7 days. Return ONLY a valid JSON array of exactly 7 objects.

NATIVE: ${lagna} Lagna | Moon: ${moonSign}/${moonNakshatra} | Dasha: ${mahadasha}/${antardasha}
PLANETS: ${planetSummary}
LAGNA INDEX: ${lagnaIdx} (Cancer=3). Transit lagna house = ((transitSignIndex - ${lagnaIdx} + 12) % 12) + 1

TRANSIT HOUSE MEANINGS:
${transitHouseMeanings}

APPROXIMATE TRANSIT LAGNA: The lagna changes sign every ~2 hours. At sunrise the lagna ≈ the Sun's sign. Estimate based on slot time relative to sunrise (each 2-hour block = 1 sign advancement).

DAYS 1-3 WITH HOURLY DATA:
${JSON.stringify(first3Days)}

DAYS 4-7 (day summary only):
${JSON.stringify(days4to7)}

FOR DAYS 1-3, return this per-day structure:
{
  "date": "YYYY-MM-DD",
  "day_score": <number from data>,
  "day_theme": "Punchy one-line theme referencing today's nakshatra and dominant planetary energy",
  "day_rating_label": "EXCELLENT|GOOD|NEUTRAL|CHALLENGING|AVOID",
  "panchang": { "tithi": "...", "nakshatra": "...", "yoga": "...", "karana": "...", "moon_sign": "..." },
  "day_overview": "200-220 word overview. MUST cover: 1) ${lagna} lagna lord's position today (Moon as lagna lord in Leo in 2nd house), 2) Day ruler and its house lordship for ${lagna}, 3) Tithi/nakshatra quality and what they activate, 4) Dasha period interaction, 5) Career guidance 2-3 sentences, 6) Financial guidance 2 sentences, 7) Health note, 8) Best hora window for the day with time, 9) Evening/night directive",
  "rahu_kaal": { "start": "HH:MM", "end": "HH:MM" },
  "best_windows": [
    { "time": "HH:MM–HH:MM", "hora": "PlanetName", "choghadiya": "Name", "score": 88, "reason": "Why this window peaks for ${lagna} specifically" }
  ],
  "avoid_windows": [{ "time": "HH:MM–HH:MM", "reason": "Specific astrological reason" }],
  "hours": [
    {
      "slot_index": <idx from slot data>,
      "time": "<slot time HH:MM:SS>",
      "end_time": "<slot end_time>",
      "hora_planet": "<hora planet name>",
      "hora_planet_symbol": "<Unicode symbol: ☉☽♂☿♃♀♄>",
      "choghadiya": "<choghadiya name>",
      "is_rahu_kaal": <true/false>,
      "transit_lagna": "<estimated transit sign e.g. Capricorn>",
      "transit_lagna_house": <house number 1-12>,
      "commentary": "Three-paragraph commentary, 110-130 words total:\\n\\nParagraph 1 (55-65 words): [PlanetName] Hora — [give this hora a title e.g. The Yogakaraka's Hour]. [Full lordship for ${lagna}: what houses it rules, why it matters, what it activates]. [Specific activities ideal for this hora given the dasha]. [One thing to specifically avoid].\\n\\nParagraph 2 (30-40 words): Transit Lagna in [SIGN] = [N]th house activation. [What this house governs for ${lagna}]. [How the sign lord's energy colors this hour]. [Specific effect].\\n\\nParagraph 3 (25-35 words): [★/★★/★★★/⚠/⚠⚠] [CHOGHADIYA NAME] ([translation]) — [quality and specific effect]. [Does it amplify or dampen the hora?]. [Final directive]."
    }
  ]
}

FOR DAYS 4-7, same structure but WITHOUT "hours" array. day_overview can be 100 words.

CRITICAL RULES:
1. Return EXACTLY 7 objects in a JSON array (days 1-3 with hours, days 4-7 without)
2. For each day's "hours", include ALL slots from that day's slots array (match by slot idx)
3. Do NOT truncate — include every single slot
4. Keep commentary under 130 words per slot to stay within token budget
5. Match slot_index to the idx field from input data`;

    console.log('[DIAG-6] Original micro prompt length (split into A/B/C calls):', microPrompt?.length || 0);

    const macroSystemPrompt = buildMacroSystemPrompt(lagnaContext);
    const microSystemPrompt = buildMicroSystemPrompt(lagnaContext, mahadasha, antardasha);
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // All 7 days summary for Call A (daily overviews only — no slot data)
    const allDaysSummary = forecast.days.slice(0, 7).map((d: any, i: number) => ({
      dayIdx: i,
      date: d.date,
      score: d.rating?.day_score ?? 50,
      panchang: {
        tithi: d.panchang?.tithi || '',
        nakshatra: d.panchang?.nakshatra || '',
        yoga: d.panchang?.yoga || '',
        karana: d.panchang?.karana || '',
        moon_sign: d.panchang?.moon_sign || '',
        sunrise: d.panchang?.sunrise || '',
        day_ruler: d.panchang?.day_ruler || '',
      },
      rahu_kaal: d.rahu_kaal || {},
    }));

    // CALL A — Daily overviews for all 7 days (max_tokens: 4000)
    const microPromptA = `Generate daily theme and overview for 7 days. Return ONLY valid JSON.

NATIVE: ${lagna} Lagna | Moon: ${moonSign}/${moonNakshatra} | Dasha: ${mahadasha}/${antardasha}
PLANETS: ${planetSummary}
DAYS DATA:
${JSON.stringify(allDaysSummary)}

Return this EXACT JSON (no markdown):
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "day_theme": "Punchy one-line theme referencing nakshatra and dominant planetary energy",
      "day_overview": "150-200 word paragraph covering: lagna lord position, day ruler, tithi/nakshatra quality, dasha interaction, career/money/health guidance, best hora window"
    }
  ]
}

Return exactly 7 day objects.`;

    console.log('[CALL-A] Starting daily overviews, prompt length:', microPromptA.length);
    let callAResult: any = null;
    try {
      callAResult = await callClaudeMicro(microSystemPrompt, microPromptA, 4000);
      console.log('[CALL-A] Days in result:', callAResult?.days?.length ?? 'MISSING');
    } catch (e: any) {
      console.error('[CALL-A] Failed:', e?.message);
    }
    await sleep(3000);

    // CALL B — Hourly commentary for days 1-3 (max_tokens: 5000)
    const microPromptB = `Generate hourly slot commentary for days 1-3. Return ONLY valid JSON.

NATIVE: ${lagna} Lagna | Moon: ${moonSign}/${moonNakshatra} | Dasha: ${mahadasha}/${antardasha}
TRANSIT HOUSE MEANINGS:
${transitHouseMeanings}

DAYS 1-3 HOURLY DATA:
${JSON.stringify(first3Days)}

Return this EXACT JSON:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "slots": [
        {
          "slot_index": 0,
          "commentary": "60-word commentary: hora lord role for ${lagna} lagna, choghadiya quality, transit lagna house effect, activity guidance"
        }
      ]
    }
  ]
}

Include ALL 18 slots per day. Return exactly 3 day objects.`;

    console.log('[CALL-B] Starting hourly days 1-3, prompt length:', microPromptB.length);
    let callBResult: any = null;
    try {
      callBResult = await callClaudeMicro(microSystemPrompt, microPromptB, 5000);
      console.log('[CALL-B] Days:', callBResult?.days?.length ?? 'MISSING', 'Day0 slots:', callBResult?.days?.[0]?.slots?.length ?? 'MISSING');
    } catch (e: any) {
      console.error('[CALL-B] Failed:', e?.message);
    }
    await sleep(3000);

    // CALL C — Hourly commentary for days 4-7 (max_tokens: 4000)
    const days4to7WithSlots = forecast.days.slice(3, 7).map((d: any, i: number) => slimDay(d, i + 3));
    const microPromptC = `Generate hourly slot commentary for days 4-7. Return ONLY valid JSON.

NATIVE: ${lagna} Lagna | Moon: ${moonSign}/${moonNakshatra} | Dasha: ${mahadasha}/${antardasha}
TRANSIT HOUSE MEANINGS:
${transitHouseMeanings}

DAYS 4-7 HOURLY DATA:
${JSON.stringify(days4to7WithSlots)}

Return this EXACT JSON:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "slots": [
        {
          "slot_index": 0,
          "commentary": "40-word commentary: hora quality, choghadiya effect, transit lagna house, guidance"
        }
      ]
    }
  ]
}

Include ALL 18 slots per day. Return exactly 4 day objects.`;

    console.log('[CALL-C] Starting hourly days 4-7, prompt length:', microPromptC.length);
    let callCResult: any = null;
    try {
      callCResult = await callClaudeMicro(microSystemPrompt, microPromptC, 4000);
      console.log('[CALL-C] Days:', callCResult?.days?.length ?? 'MISSING', 'Day0 slots:', callCResult?.days?.[0]?.slots?.length ?? 'MISSING');
    } catch (e: any) {
      console.error('[CALL-C] Failed:', e?.message);
    }
    await sleep(3000);

    // CALL D — Macro (nativity_summary + monthly + weekly + period_synthesis)
    console.log('[DIAG-2] Starting macro Claude call');
    console.log('[DIAG-2] Macro prompt length:', macroPrompt?.length || 0);
    console.log('[DIAG-2] Macro system prompt length:', macroSystemPrompt?.length || 0);

    let macroCommentary: any = {};
    try {
      const macroValue = await callClaudeMacro(macroSystemPrompt, macroPrompt, 6000);
      macroCommentary = macroValue ?? {};
      console.log('Macro OK — keys:', Object.keys(macroCommentary));
    } catch (e: any) {
      console.error('Macro failed:', e?.message);
    }

    // Merge Call A + B + C results into dailyArray
    const callADays: any[] = callAResult?.days ?? [];
    const callBDays: any[] = callBResult?.days ?? [];
    const callCDays: any[] = callCResult?.days ?? [];
    const callBByDate = new Map<string, any>(callBDays.map((d: any) => [d.date, d]));
    const callCByDate = new Map<string, any>(callCDays.map((d: any) => [d.date, d]));

    let dailyArray: any[] = [];
    if (callADays.length > 0) {
      dailyArray = callADays.map((dayA: any) => {
        const date = dayA.date;
        const hourlySource = callBByDate.get(date) ?? callCByDate.get(date);
        const slots = hourlySource?.slots ?? [];
        return {
          date,
          day_theme: dayA.day_theme,
          day_overview: dayA.day_overview,
          hours: slots.map((s: any) => ({ slot_index: s.slot_index, commentary: s.commentary })),
        };
      });
      const day0Hours = dailyArray[0]?.hours?.length ?? 0;
      const day0commentary = dailyArray[0]?.hours?.[0]?.commentary?.slice(0, 80) ?? 'NONE';
      console.log(`Micro merged — days: ${dailyArray.length}, day0 hours: ${day0Hours}, day0 h0: ${day0commentary}`);
    } else {
      console.error('Call A returned no days — fallback will apply');
    }

    // Build fallback daily entries if needed
    if (dailyArray.length === 0 && forecast.days?.length > 0) {
      console.log('Building fallback daily entries from forecast data...');
      dailyArray = forecast.days.slice(0, 7).map((day: any) => {
        const score = day.rating?.day_score ?? 50;
        const panchang = day.panchang || {};
        const overview = dayFallback(score, panchang);
        return {
          date: day.date || '',
          day_score: score,
          day_theme: day.narrative ? day.narrative.slice(0, 80) : `Day score ${score} — use hora windows wisely.`,
          day_rating_label: score >= 70 ? 'GOOD' : score >= 50 ? 'NEUTRAL' : 'CHALLENGING',
          panchang,
          day_overview: day.narrative || overview,
          rahu_kaal: { start: day.rahu_kaal?.start_time ?? '', end: day.rahu_kaal?.end_time ?? '' },
          best_windows: (day.rating?.peak_windows || []).slice(0, 3).map((w: any) => ({
            time: `${w.start_time || ''}–${w.end_time || ''}`,
            hora: w.hora_ruler || '',
            choghadiya: w.choghadiya || '',
            score: w.rating || 0,
            reason: '',
          })),
          avoid_windows: [],
          hours: [],
        };
      });
    }

    // Merge dailyArray with forecast days to fill slots with fallbacks
    const forecastDays = forecast.days || [];
    const filledDaily = dailyArray.map((cd: any, i: number) => {
      const fd = forecastDays[i];
      const slots = fd?.rating?.all_slots ?? [];
      const commentaryHours = cd?.hours ?? [];
      const panchang = cd?.panchang ?? fd?.panchang ?? {};
      const dayScore = cd?.day_score ?? fd?.rating?.day_score ?? 50;

      const filledHours = slots.map((s: any, slotIdx: number) => {
        const match = commentaryHours.find((ch: any) => ch.slot_index === slotIdx || (ch.time ?? '').slice(0, 5) === (s.start_time ?? '').slice(0, 5));
        const rawCommentary = match?.commentary ?? '';
        const slotData = { hora: s.hora_ruler, chog: s.choghadiya, score: s.rating ?? 50, rk: s.is_rahu_kaal };
        const fb = slotFallback(slotData);
        const commentary = rawCommentary?.trim() || fb;
        const commentary_short = deriveCommentaryShort(rawCommentary, slotFallbackShort(slotData));
        return { ...match, slot_index: slotIdx, commentary, commentary_short };
      });

      const overviewFallback = dayFallback(dayScore, panchang);
      const dayOverview = (cd?.day_overview ?? '').trim() || overviewFallback;
      const dayTheme = (cd?.day_theme ?? '').trim() || `Day score ${dayScore} — ${panchang.nakshatra || 'lunar'} influences.`;
      const peak_count = slots.filter((s: any) => (s.rating ?? 50) >= 75 && !(s.is_rahu_kaal ?? false)).length;
      const caution_count = slots.filter((s: any) => (s.rating ?? 50) < 45 || (s.is_rahu_kaal ?? false)).length;

      return {
        ...cd,
        date: cd?.date ?? fd?.date ?? '',
        day_score: dayScore,
        day_theme: dayTheme,
        day_overview: dayOverview,
        hours: filledHours.length > 0 ? filledHours : cd?.hours ?? [],
        peak_count,
        caution_count,
      };
    });

    // Pad months to 12, weeks to 6
    const rawMonthly = Array.isArray(macroCommentary?.monthly) ? macroCommentary.monthly : [];
    console.log('[Macro] months array length:', rawMonthly.length || 'MISSING');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const today = new Date();
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const m = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const label = `${monthNames[m.getMonth()]} ${m.getFullYear()}`;
      const existing = rawMonthly[i];
      const commentary = (existing?.commentary ?? '').trim() || `Monthly overview for ${label}. Transit activations and dasha themes shape this period.`;
      return {
        month: existing?.month ?? label,
        score: existing?.score ?? existing?.overall_score ?? 65,
        overall_score: existing?.overall_score ?? existing?.score ?? 65,
        career_score: existing?.career_score ?? 65,
        money_score: existing?.money_score ?? 65,
        health_score: existing?.health_score ?? 65,
        love_score: existing?.love_score ?? 65,
        theme: (existing?.theme ?? '').trim() || `${label} energy arc.`,
        key_transits: Array.isArray(existing?.key_transits) ? existing.key_transits : [],
        commentary,
        weekly_scores: Array.isArray(existing?.weekly_scores) ? existing.weekly_scores : [65, 65, 65, 65],
      };
    });

    const rawWeekly = Array.isArray(macroCommentary?.weekly) ? macroCommentary.weekly : [];
    console.log('[Macro] weeks array length:', rawWeekly.length || 'MISSING');
    const weekly = Array.from({ length: 6 }, (_, i) => {
      const existing = rawWeekly[i];
      const commentary = (existing?.commentary ?? '').trim() || `Weekly energy arc. Moon nakshatra progression and hora patterns guide daily timing.`;
      return {
        week_label: (existing?.week_label ?? '').trim() || `Week ${i + 1} of 6`,
        week_start: existing?.week_start ?? '',
        score: existing?.score ?? 65,
        theme: (existing?.theme ?? '').trim() || `Week ${i + 1} themes.`,
        commentary,
        daily_scores: Array.isArray(existing?.daily_scores) ? existing.daily_scores : [65, 65, 65, 65, 65, 65, 65],
        moon_journey: Array.isArray(existing?.moon_journey) ? existing.moon_journey : [],
        peak_days_count: existing?.peak_days_count ?? 2,
        caution_days_count: existing?.caution_days_count ?? 1,
      };
    });

    const ps = macroCommentary?.period_synthesis;
    const synthesisFallbackText = synthesisFallback(filledDaily);
    const periodSynthesis = {
      opening_paragraph: (ps?.opening_paragraph ?? '').trim() || synthesisFallbackText,
      strategic_windows: Array.isArray(ps?.strategic_windows) ? ps.strategic_windows : [],
      caution_dates: Array.isArray(ps?.caution_dates) ? ps.caution_dates : [],
      domain_priorities: ps?.domain_priorities ?? {
        career: 'Focus on Yogakaraka and 10th house activations for career moves.',
        money: '2nd and 11th house transits influence gains.',
        health: 'Lagna lord and 6th house themes affect wellbeing.',
        relationships: '7th house and Badhaka themes require care.',
      },
      closing_paragraph: (ps?.closing_paragraph ?? '').trim() || 'This forecast period offers opportunities and challenges. Use hora and choghadiya to align actions with cosmic rhythms.',
    };

    const ns = macroCommentary?.nativity_summary;
    const nativityFallbackText = nativityFallback(lagna, moonSign, `${mahadasha}/${antardasha}`);
    const nativitySummary = {
      lagna_analysis: (ns?.lagna_analysis ?? '').trim() || nativityFallbackText,
      current_dasha_interpretation: (ns?.current_dasha_interpretation ?? '').trim() || `Current ${mahadasha}/${antardasha} dasha period shapes dominant themes.`,
      key_yogas: Array.isArray(ns?.key_yogas) ? ns.key_yogas : [],
      functional_benefics: Array.isArray(ns?.functional_benefics) ? ns.functional_benefics : [],
      functional_malefics: Array.isArray(ns?.functional_malefics) ? ns.functional_malefics : [],
    };

    const finalCommentary = {
      nativity_summary: nativitySummary,
      monthly,
      weekly,
      daily: filledDaily,
      period_synthesis: periodSynthesis,
    };

    console.log(`Final commentary: daily=${finalCommentary.daily.length}, monthly=${finalCommentary.monthly.length}, weekly=${finalCommentary.weekly.length}`);

    const reportData = buildReportData(natalChart, nativity, forecast, finalCommentary, 'gen-' + Date.now(), body.reportType || '7day', '+04:00');
    const validationErrors = validateReportData(reportData);
    const sampleSlot = reportData.days[0]?.slots?.[0];
    const sampleSynthesis = reportData.synthesis;

    const responseData = finalCommentary;
    console.log('[DIAG-8] Final response being sent');
    console.log('[DIAG-8] months in response:', responseData?.monthly?.length ?? 'MISSING');
    console.log('[DIAG-8] weeks in response:', responseData?.weekly?.length ?? 'MISSING');
    console.log('[DIAG-8] synthesis in response:', !!responseData?.period_synthesis || !!(responseData as any)?.synthesis);
    console.log('[DIAG-8] days with commentary:', responseData?.daily?.filter((d: any) => d.day_overview && d.day_overview.length > 30).length ?? 0);

    return NextResponse.json({
      commentary: finalCommentary,
      validationReport: { errors: validationErrors },
      sampleSlot: sampleSlot ? { commentary: sampleSlot.commentary, commentary_short: sampleSlot.commentary_short } : null,
      sampleSynthesis: sampleSynthesis ? { opening_paragraph: sampleSynthesis.opening_paragraph } : null,
    });

  } catch (error: any) {
    console.error('Generate commentary error:', error?.message || error);
    const nc = body?.natalChart;
    const lagna = nc?.lagna ?? 'Unknown';
    const moonSign = nc?.planets?.Moon?.sign ?? 'Unknown';
    const cd = nc?.current_dasha;
    const dasha = cd ? `${cd.mahadasha ?? '?'}/${cd.antardasha ?? '?'}` : 'Unknown';
    const fb = nativityFallback(lagna, moonSign, dasha);
    return NextResponse.json({
      commentary: {
        nativity_summary: {
          lagna_analysis: fb,
          current_dasha_interpretation: `Dasha period interpretation. ${fb}`,
          key_yogas: [],
          functional_benefics: [],
          functional_malefics: [],
        },
        monthly: Array.from({ length: 12 }, (_, i) => ({
          month: `Month ${i + 1}`,
          score: 65,
          overall_score: 65,
          commentary: synthesisFallback([]),
          theme: '',
          key_transits: [],
          weekly_scores: [65, 65, 65, 65],
        })),
        weekly: Array.from({ length: 6 }, () => ({
          week_label: '',
          week_start: '',
          score: 65,
          theme: '',
          commentary: synthesisFallback([]),
          daily_scores: [65, 65, 65, 65, 65, 65, 65],
          moon_journey: [],
          peak_days_count: 2,
          caution_days_count: 1,
        })),
        daily: [],
        period_synthesis: {
          opening_paragraph: synthesisFallback([]),
          strategic_windows: [],
          caution_dates: [],
          domain_priorities: { career: fb, money: fb, health: fb, relationships: fb },
          closing_paragraph: fb,
        },
        _error: error?.message || 'Commentary generation failed',
      },
    });
  }
}
