import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300;

let anthropic: Anthropic | null = null;
try {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} catch (e) {
  console.error('Anthropic SDK init failed in generate-commentary:', e);
}

const GRANDMASTER_SYSTEM_PROMPT = `You are Jyotish AI — a grandmaster Vedic astrologer combining Swiss Ephemeris precision with deep classical Jyotish knowledge. You have access to verified planetary positions, dasha timelines, and panchang data.

Your commentary style:
- Reference the native's SPECIFIC lagna, natal placements, and yogas (not generic astrology)
- For Cancer Lagna: always note Mars as Yogakaraka (5th+10th lord), Jupiter as 9th lord (exalted in 1st), Moon as lagna lord in Leo 2nd house, Saturn as 7th+8th lord (malefic)
- Name actual transits, eclipses, Mercury Rx periods
- Use classical terminology: yogakaraka, badhaka, dhana yoga, raja yoga, ashtama shani, janma guru, chara dasha, etc.
- Be specific and actionable. Never vague.
- Tone: warm, direct, authoritative — like a trusted mentor who also happens to be a cosmic engineer`;

function tryParseJSON(text: string): any {
  let jsonText = text.trim();
  jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const objStart = jsonText.indexOf('{');
  const arrStart = jsonText.indexOf('[');
  if (objStart >= 0 || arrStart >= 0) {
    const start = objStart >= 0 && arrStart >= 0
      ? Math.min(objStart, arrStart)
      : Math.max(objStart, arrStart);
    const isArray = jsonText[start] === '[';
    const end = jsonText.lastIndexOf(isArray ? ']' : '}');
    if (end > start) {
      jsonText = jsonText.substring(start, end + 1);
    }
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    // Attempt repair: find the last complete object boundary and close
  }

  // Repair: truncate to last complete element
  const lastCompleteObj = jsonText.lastIndexOf('},');
  if (lastCompleteObj > 0) {
    const isArrayOuter = jsonText.trimStart().startsWith('[');
    const truncated = jsonText.substring(0, lastCompleteObj + 1) + (isArrayOuter ? ']' : '}');
    try {
      console.log('JSON repair: truncated at position', lastCompleteObj, 'of', jsonText.length);
      return JSON.parse(truncated);
    } catch { /* fall through */ }
  }

  // Repair: try closing with }] or }}
  for (const suffix of ['}]', '}}', '"]}}', '"]}]', '"}]']) {
    const lastBrace = jsonText.lastIndexOf('}');
    if (lastBrace > 0) {
      try {
        return JSON.parse(jsonText.substring(0, lastBrace) + suffix);
      } catch { /* try next */ }
    }
  }

  throw new Error(`JSON parse failed. First 200 chars: ${jsonText.substring(0, 200)}`);
}

async function callClaudeWithRetry(userPrompt: string, maxTokens: number, retries = 2) {
  if (!anthropic) throw new Error('Anthropic SDK not initialized — check ANTHROPIC_API_KEY');

  let lastError: any;
  let lastRawText = '';
  const delays = [2000, 4000, 8000];

  for (let i = 0; i < retries; i++) {
    try {
      const prompt = i === 0
        ? userPrompt
        : `The previous JSON response was truncated at ~${lastRawText.length} characters. Return ONLY the same JSON but with shorter commentaries (max 15 words per hourly slot, max 2 sentences per day overview) so it fits within the token limit. Keep all fields and structure identical.\n\nOriginal request:\n${userPrompt}`;

      console.log(`Claude call attempt ${i + 1}/${retries}, max_tokens: ${maxTokens}`);
      const response = await anthropic!.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        temperature: 0.7,
        system: GRANDMASTER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        lastRawText = content.text;
        const stopReason = response.stop_reason;
        console.log(`Claude response: ${content.text.length} chars, stop_reason: ${stopReason}`);

        if (stopReason === 'end_turn') {
          return tryParseJSON(content.text);
        }

        console.warn('Response truncated (stop_reason:', stopReason, ') — attempting JSON repair');
        try {
          return tryParseJSON(content.text);
        } catch (parseErr: any) {
          console.error('JSON repair failed:', parseErr.message);
          if (i < retries - 1) continue;
          throw parseErr;
        }
      }
    } catch (error: any) {
      lastError = error;
      const status = error?.status;

      if (status === 401) throw new Error('Invalid Anthropic API key. Check .env.local ANTHROPIC_API_KEY');

      if (status === 429 || status === 529) {
        const delay = status === 529 ? 5000 : delays[Math.min(i, delays.length - 1)];
        console.warn(`Anthropic ${status}, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (status === 400) {
        console.error('Anthropic 400 bad request:', error?.message);
        throw error;
      }

      console.error(`Claude call failed (attempt ${i + 1}):`, error?.message || error);
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delays[Math.min(i, delays.length - 1)]));
      }
    }
  }
  throw lastError || new Error('Failed after retries');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { natalChart, nativity, forecast, reportType } = body;

    console.log('Generate-commentary received - keys:', Object.keys(body));
    console.log('natalChart?.lagna:', natalChart?.lagna);
    console.log('forecast has days:', !!forecast?.days, 'count:', forecast?.days?.length);

    if (!natalChart || !forecast) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    if (!forecast.days || !Array.isArray(forecast.days) || forecast.days.length === 0) {
      console.error('Forecast has no days array. Keys:', Object.keys(forecast));
      return NextResponse.json(
        { error: `Forecast missing days array. Got keys: ${Object.keys(forecast).join(', ')}` },
        { status: 400 }
      );
    }

    const lagna = natalChart.lagna || 'Unknown';
    const moonSign = natalChart.planets?.Moon?.sign || 'Unknown';
    const moonNakshatra = natalChart.moon_nakshatra || 'Unknown';
    const currentDasha = natalChart.current_dasha || {};
    const mahadasha = currentDasha.mahadasha || 'Unknown';
    const antardasha = currentDasha.antardasha || 'Unknown';

    const dailyScores = forecast.days.slice(0, 30).map((day: any) => ({
      date: day.date,
      score: day.rating?.day_score ?? day.day_score ?? day.average_score ?? 70,
      tithi: day.panchang?.tithi || '',
      nakshatra: day.panchang?.nakshatra || '',
    }));

    // Build concise planet summary to reduce prompt size
    const planetSummary = Object.entries(natalChart.planets || {})
      .map(([name, p]: [string, any]) =>
        `${name}: ${p?.sign || '?'} ${(p?.degree ?? 0).toFixed(1)} H${p?.house ?? '?'} ${p?.nakshatra || '?'}${p?.is_retrograde ? ' (R)' : ''}`
      ).join(', ');

    const nativityBrief = nativity ? {
      lagna_analysis: nativity.lagna_analysis || '',
      yogas: (nativity.yogas || []).slice(0, 5).map((y: any) => typeof y === 'string' ? y : y?.name || ''),
      functional_benefics: nativity.functional_benefics || [],
      functional_malefics: nativity.functional_malefics || [],
      strengths: (nativity.strengths || []).slice(0, 3),
    } : {};

    // ── CALL 1: MACRO COMMENTARY (max_tokens: 6000) ──
    const macroPrompt = `Generate macro commentary for this native. Return ONLY valid JSON, no markdown backticks.

Native: ${natalChart.name || 'Seeker'}, ${lagna} Lagna, Moon in ${moonSign}/${moonNakshatra}, Current dasha: ${mahadasha}/${antardasha}
Planets: ${planetSummary}
Lagna degree: ${(natalChart.lagna_degree ?? 0).toFixed(1)}
Nativity: ${JSON.stringify(nativityBrief)}
30-day scores: ${JSON.stringify(dailyScores)}

Return:
{
  "nativity_summary": {
    "lagna_analysis": "3-4 sentences about the lagna, its lord placement, and core personality signature. Reference specific natal placements.",
    "current_dasha_interpretation": "2-3 sentences about what ${mahadasha}-${antardasha} period means specifically for this native's chart.",
    "key_yogas": ["Yoga name with one-line explanation"],
    "functional_benefics": ["Planet (role)"],
    "functional_malefics": ["Planet (role)"]
  },
  "monthly": [
    {
      "month": "March 2026",
      "score": 72,
      "overall_score": 72,
      "career_score": 74,
      "money_score": 70,
      "health_score": 71,
      "love_score": 73,
      "theme": "Eclipse recovery + Jupiter direct relief",
      "key_transits": ["Jupiter stations direct Mar 10 in Gemini (12th house)"],
      "commentary": "300-400 words. MUST include: 1) Major transits during the month. 2) Eclipses or retrograde periods if any. 3) Dasha sub-period activation themes. 4) Monthly arc: first/second half energy shift. 5) Specific high-score and low-score dates with reasons why. Reference house activation for ${lagna} Lagna.",
      "weekly_scores": [68, 72, 75, 74]
    }
  ],
  "weekly": [
    {
      "week_label": "Mar 2 – Mar 8",
      "week_start": "2026-03-02",
      "score": 71,
      "theme": "One compelling theme line",
      "commentary": "200-250 words. MUST include: 1) Arc narrative: how energy shifts across the 7 days. 2) The week's nakshatra progression and its meaning. 3) Transit events (Moon sign changes, etc.). 4) Standout days with specific reasons. 5) Domain guidance: career, money, health, relationships.",
      "daily_scores": [70, 73, 68, 75, 72, 69, 74]
    }
  ],
  "period_synthesis": {
    "opening_paragraph": "150 words on dominant energy and natal chart interaction",
    "strategic_windows": [{"date": "Feb 25", "nakshatra": "Rohini", "score": 83, "reason": "One sentence why"}],
    "caution_dates": [{"date": "Mar 2", "nakshatra": "Ashlesha", "score": 47, "reason": "One sentence why"}],
    "domain_priorities": {"career": "40 words", "money": "40 words", "health": "40 words", "relationships": "40 words"},
    "closing_paragraph": "80 words on spiritual teaching"
  }
}`;

    // ── CALL 2: DAILY + HOURLY COMMENTARY (max_tokens: 16000) ──
    // Build micro prompt BEFORE calling, so both calls run in parallel
    // Slim down data: only send essential fields, not full rating objects
    const slimDay = (day: any) => {
      const rating = day.rating || {};
      const peakSlots = (rating.peak_windows || []).slice(0, 3).map((s: any) => ({
        time: s.start_time, ruler: s.hora_ruler, chog: s.choghadiya, score: s.rating,
      }));
      const avoidSlots = (rating.avoid_windows || []).slice(0, 2).map((s: any) => ({
        time: s.start_time, ruler: s.hora_ruler, rk: s.is_rahu_kaal,
      }));
      const horaSchedule = (rating.all_slots || []).map((s: any) => ({
        t: s.start_time, r: s.hora_ruler, c: s.choghadiya, sc: s.rating, rk: s.is_rahu_kaal ? 1 : 0,
      }));
      return {
        date: day.date,
        score: rating.day_score ?? 50,
        panchang: day.panchang || {},
        narrative: day.narrative || '',
        peak: peakSlots,
        avoid: avoidSlots,
        hours: horaSchedule,
      };
    };

    const first3Days = forecast.days.slice(0, 3).map(slimDay);
    const days4to7 = forecast.days.slice(3, 7).map((d: any) => ({
      date: d.date,
      score: d.rating?.day_score ?? d.day_score ?? 70,
      panchang: d.panchang || {},
    }));

    const microPrompt = `Generate daily and hourly commentary for 7 days. Return ONLY valid JSON, no markdown.

Native: ${lagna} Lagna, current dasha: ${mahadasha}/${antardasha}

DAYS 1-3 (with hourly schedule):
${JSON.stringify(first3Days)}

DAYS 4-7 (summary only):
${JSON.stringify(days4to7)}

INSTRUCTIONS:
- For days 1-3: return FULL object with hours array (24 entries each)
- For days 4-7: omit the hours array entirely — just return date, day_score, day_theme, day_rating_label, panchang, day_overview, rahu_kaal, best_windows, avoid_windows.

For EACH of days 1-3:
{
  "date": "YYYY-MM-DD",
  "day_score": 74,
  "day_theme": "One punchy theme line",
  "day_rating_label": "EXCELLENT|GOOD|NEUTRAL|CHALLENGING|AVOID",
  "panchang": {
    "tithi": "...", "nakshatra": "...",
    "yoga": "...", "karana": "...",
    "moon_sign": "..."
  },
  "day_overview": "120-150 words. MUST include: 1) Nakshatra ruler and its natal house lordship. 2) Tithi's spiritual and practical significance. 3) Day's dominant planetary energy and its house. 4) Specific windows (hora times) to act vs avoid. 5) One career, one financial, one health recommendation. 6) Reference to current dasha (${mahadasha}-${antardasha}) interaction.",
  "rahu_kaal": { "start": "HH:MM", "end": "HH:MM" },
  "best_windows": [
    { "time": "HH:MM-HH:MM", "hora": "Jupiter", "choghadiya": "Amrit", "score": 88, "reason": "One sentence" }
  ],
  "avoid_windows": [
    { "time": "HH:MM-HH:MM", "reason": "Rahu Kaal / malefic combination" }
  ],
  "hours": [
    {
      "time": "06:00",
      "end_time": "07:00",
      "score": 82,
      "hora_planet": "Jupiter",
      "hora_planet_symbol": "♃",
      "choghadiya": "Amrit",
      "choghadiya_quality": "excellent",
      "transit_lagna": "Cancer",
      "transit_lagna_house": 1,
      "is_rahu_kaal": false,
      "commentary": "35-45 words. MUST include: 1) Hora planet's natal house lordship for ${lagna} Lagna (e.g. Jupiter hora activates 9th lord). 2) Transit lagna house position. 3) Choghadiya quality with specific effect. 4) One specific actionable recommendation. 5) Rahu Kaal warning if applicable."
    }
  ]
}

For EACH of days 4-7 (NO hours array):
{
  "date": "YYYY-MM-DD",
  "day_score": 70,
  "day_theme": "Theme line",
  "day_rating_label": "GOOD",
  "panchang": { "tithi": "...", "nakshatra": "...", "yoga": "...", "karana": "...", "moon_sign": "..." },
  "day_overview": "2-3 sentence overview.",
  "rahu_kaal": { "start": "HH:MM", "end": "HH:MM" },
  "best_windows": [{ "time": "HH:MM-HH:MM", "hora": "Jupiter", "choghadiya": "Amrit", "score": 85, "reason": "One sentence" }],
  "avoid_windows": [{ "time": "HH:MM-HH:MM", "reason": "Reason" }]
}

Return array of 7 day objects. Keep commentaries concise to avoid truncation.`;

    // Run BOTH Claude calls in parallel to halve total time
    console.log('Calling Claude for macro + daily/hourly commentary in parallel...');
    const [macroResult, microResult] = await Promise.allSettled([
      callClaudeWithRetry(macroPrompt, 8000),
      callClaudeWithRetry(microPrompt, 10000),
    ]);

    const macroCommentary = macroResult.status === 'fulfilled' ? macroResult.value : {};
    if (macroResult.status === 'rejected') {
      console.error('Macro commentary failed:', macroResult.reason?.message);
    } else {
      console.log('Macro commentary received - keys:', Object.keys(macroCommentary));
    }

    let dailyArray: any[] = [];
    if (microResult.status === 'fulfilled') {
      const raw = microResult.value;
      console.log('Micro result type:', typeof raw, 'isArray:', Array.isArray(raw));
      if (Array.isArray(raw)) {
        dailyArray = raw;
      } else if (raw?.days && Array.isArray(raw.days)) {
        dailyArray = raw.days;
      } else if (raw && typeof raw === 'object') {
        const vals = Object.values(raw);
        const arrVal = vals.find((v) => Array.isArray(v)) as any[] | undefined;
        if (arrVal) dailyArray = arrVal;
      }
      console.log('Daily commentary count:', dailyArray.length);
    } else {
      console.error('Micro commentary failed:', microResult.reason?.message);
    }

    // Fallback: if micro call failed or returned empty, generate basic daily entries from forecast data
    if (dailyArray.length === 0 && forecast.days?.length > 0) {
      console.log('Generating fallback daily entries from forecast data...');
      dailyArray = forecast.days.slice(0, 7).map((day: any) => ({
        date: day.date || '',
        day_score: day.rating?.day_score ?? 50,
        day_theme: day.narrative ? day.narrative.slice(0, 80) : 'Daily forecast',
        day_rating_label: (day.rating?.day_score ?? 50) >= 70 ? 'GOOD' : (day.rating?.day_score ?? 50) >= 50 ? 'NEUTRAL' : 'CHALLENGING',
        panchang: day.panchang || {},
        day_overview: day.narrative || 'Based on today\'s panchang and hora patterns, this day shows moderate potential. Focus on key activities during the optimal windows.',
        rahu_kaal: { start: '', end: '' },
        best_windows: (day.rating?.peak_windows || []).slice(0, 3).map((w: any) => ({
          time: `${w.start_time || ''}–${w.end_time || ''}`,
          hora: w.hora_ruler || '',
          choghadiya: w.choghadiya || '',
          score: w.rating || 0,
          reason: '',
        })),
        avoid_windows: [],
      }));
    }

    const finalCommentary = {
      nativity_summary: macroCommentary.nativity_summary || {
        lagna_analysis: 'Analysis temporarily unavailable.',
        current_dasha_interpretation: '',
        key_yogas: [],
        functional_benefics: [],
        functional_malefics: [],
      },
      monthly: macroCommentary.monthly || [],
      weekly: macroCommentary.weekly || [],
      daily: dailyArray,
      period_synthesis: macroCommentary.period_synthesis ?? '',
    };

    console.log('Final commentary assembled - daily count:', finalCommentary.daily.length);
    return NextResponse.json({ commentary: finalCommentary });
  } catch (error: any) {
    console.error('Generate commentary error:', error?.message || error);

    // Return partial fallback so the report page still renders
    return NextResponse.json({
      commentary: {
        nativity_summary: {
          lagna_analysis: 'Analysis temporarily unavailable. Please try again.',
          current_dasha_interpretation: '',
          key_yogas: [],
          functional_benefics: [],
          functional_malefics: [],
        },
        monthly: [],
        weekly: [],
        daily: [],
        period_synthesis: '',
        _error: error?.message || 'Commentary generation failed',
      },
    });
  }
}
