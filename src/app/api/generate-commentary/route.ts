import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GRANDMASTER_SYSTEM_PROMPT = `You are Jyotish AI — a grandmaster Vedic astrologer combining Swiss Ephemeris precision with deep classical Jyotish knowledge. You have access to verified planetary positions, dasha timelines, and panchang data.

Your commentary style:
- Reference the native's SPECIFIC lagna, natal placements, and yogas (not generic astrology)
- For Cancer Lagna: always note Mars as Yogakaraka (5th+10th lord), Jupiter as 9th lord (exalted in 1st), Moon as lagna lord in Leo 2nd house, Saturn as 7th+8th lord (malefic)
- Name actual transits, eclipses, Mercury Rx periods
- Use classical terminology: yogakaraka, badhaka, dhana yoga, raja yoga, ashtama shani, janma guru, chara dasha, etc.
- Be specific and actionable. Never vague.
- Tone: warm, direct, authoritative — like a trusted mentor who also happens to be a cosmic engineer`;

async function callClaudeWithRetry(userPrompt: string, maxTokens: number, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        temperature: 0.7,
        system: GRANDMASTER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        let jsonText = content.text.trim();
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        return JSON.parse(jsonText);
      }
    } catch (error) {
      console.error(`Claude call failed (attempt ${i + 1}):`, error);
      if (i === retries - 1) throw error;
    }
  }
  throw new Error('Failed after retries');
}

export async function POST(req: NextRequest) {
  try {
    const { natalChart, nativity, forecast, reportType } = await req.json();

    if (!natalChart || !forecast) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    const lagna = natalChart.lagna || 'Unknown';
    const moonSign = natalChart.planets?.Moon?.sign || 'Unknown';
    const moonNakshatra = natalChart.moon_nakshatra || 'Unknown';
    const currentDasha = natalChart.current_dasha || {};
    const mahadasha = currentDasha.mahadasha || 'Unknown';
    const antardasha = currentDasha.antardasha || 'Unknown';

    // Simplify forecast for macro call
    const dailyScores = forecast.days?.slice(0, 30).map((day: any) => ({
      date: day.date,
      score: day.average_score || 70,
      panchang: day.panchang || {},
    })) || [];

    // ── CALL 1: MACRO COMMENTARY ──
    const macroPrompt = `Generate macro commentary for this native. Return ONLY valid JSON, no markdown backticks.

Native: ${natalChart.name || 'Seeker'}, ${lagna} Lagna, Moon in ${moonSign}/${moonNakshatra}, Current dasha: ${mahadasha}/${antardasha}
Natal chart: ${JSON.stringify(natalChart, null, 2)}
Nativity profile: ${JSON.stringify(nativity || {}, null, 2)}
30-day forecast scores: ${JSON.stringify(dailyScores, null, 2)}

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
      "commentary": "4-5 sentence paragraph. Reference specific transits and their house activation for ${lagna} Lagna. What should the native do this month? What to avoid? What opportunities arise?",
      "weekly_scores": [68, 72, 75, 74]
    }
  ],
  "weekly": [
    {
      "week_label": "Mar 2 – Mar 8",
      "week_start": "2026-03-02",
      "score": 71,
      "theme": "One compelling theme line",
      "commentary": "3-4 sentence paragraph referencing specific day energies, panchang highlights, and practical recommendations for the week.",
      "daily_scores": [70, 73, 68, 75, 72, 69, 74]
    }
  ],
  "period_synthesis": "3-4 sentence synthesis of the full forecast period, what the overall arc is, and the single most important strategic advice."
}`;

    const macroCommentary = await callClaudeWithRetry(macroPrompt, 4000);

    // ── CALL 2: DAILY + HOURLY COMMENTARY (First 7 days only) ──
    const first7Days = forecast.days?.slice(0, 7) || [];
    
    const microPrompt = `Generate daily and hourly commentary for days 1-7 of this forecast. Return ONLY valid JSON.

Native: ${lagna} Lagna, natal placements summary, current dasha: ${mahadasha}/${antardasha}
Days data: ${JSON.stringify(first7Days, null, 2)}

For EACH DAY return:
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
  "day_overview": "3-4 sentence day overview. Reference the day ruler, dominant hora patterns, panchang quality. Strategic directive for the day.",
  "rahu_kaal": { "start": "HH:MM", "end": "HH:MM" },
  "best_windows": [
    { "time": "HH:MM-HH:MM", "hora": "Jupiter", 
      "choghadiya": "Amrit", "score": 88,
      "reason": "One sentence why this is peak time" }
  ],
  "avoid_windows": [
    { "time": "HH:MM-HH:MM", "reason": "Rahu Kaal / specific malefic combination" }
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
      "commentary": "60-80 word commentary. MUST include: 1) Hora planet natal house lordship for ${lagna} Lagna and what that activates 2) Transit lagna house activation 3) Choghadiya quality and specific effect 4) 2-3 concrete activities best suited and 1-2 things to avoid. NO generic statements."
    }
  ]
}

Return array of 7 day objects.`;

    const dailyHourlyCommentary = await callClaudeWithRetry(microPrompt, 8000);

    // Merge the two responses
    const finalCommentary = {
      nativity_summary: macroCommentary.nativity_summary,
      monthly: macroCommentary.monthly,
      weekly: macroCommentary.weekly,
      daily: dailyHourlyCommentary,
      period_synthesis: macroCommentary.period_synthesis,
    };

    return NextResponse.json({ commentary: finalCommentary });
  } catch (error) {
    console.error('Generate commentary error:', error);
    
    // Return fallback
    return NextResponse.json({
      commentary: {
        nativity_summary: {
          lagna_analysis: 'Detailed analysis unavailable at this time.',
          current_dasha_interpretation: 'Dasha interpretation unavailable.',
          key_yogas: [],
          functional_benefics: [],
          functional_malefics: [],
        },
        monthly: [],
        weekly: [],
        daily: [],
        period_synthesis: 'Synthesis unavailable.',
      },
    });
  }
}
