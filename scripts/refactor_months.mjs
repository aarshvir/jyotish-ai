import * as fs from 'fs';

const file = 'src/lib/reports/orchestrator.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Update the grouped commentary check (line ~1158)
code = code.replace(
  `pipelineState.commentary_months?.allMonthsData &&`,
  `(pipelineState.commentary_months_2?.allMonthsData || pipelineState.commentary_months?.allMonthsData) &&`
);
code = code.replace(
  `allMonthsData = pipelineState.commentary_months.allMonthsData as MonthSummary[];`,
  `allMonthsData = (pipelineState.commentary_months_2?.allMonthsData ?? pipelineState.commentary_months?.allMonthsData) as MonthSummary[];`
);

// 2. Update the fallback restore (line ~1191)
code = code.replace(
  `if (phaseAtOrAfter(cp, 'commentary_months') && pipelineState.commentary_months?.allMonthsData) {
        allMonthsData = pipelineState.commentary_months.allMonthsData as MonthSummary[];
      }`,
  `if (phaseAtOrAfter(cp, 'commentary_months_2') && pipelineState.commentary_months_2?.allMonthsData) {
        allMonthsData = pipelineState.commentary_months_2.allMonthsData as MonthSummary[];
      } else if (phaseAtOrAfter(cp, 'commentary_months') && pipelineState.commentary_months?.allMonthsData) {
        allMonthsData = pipelineState.commentary_months.allMonthsData as MonthSummary[];
      }`
);

// 3. Replace the entire commentary_months block
const startMarker = "      // ── commentary_months ─────────────────────────────────────────────────────";
const endMarker = "      // ── commentary_weeks ────────────────────────────────────────────────────────";

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error("Markers not found");
  process.exit(1);
}

const replacement = `      // ── commentary_months Pre-compute ─────────────────────────────────────────
      let months1Data: MonthSummary[] = [];
      const startDate = new Date(forecastDays[0].date);
      const lagna = ephemerisData.lagna ?? 'Cancer';
      const KNOWN_INGRESSES_2026 = [
        { planet: 'Jupiter', sign: 'Taurus',      date: '2026-05-14', note: 'Jupiter enters Taurus (H? for lagna) — expansion of resources, 12-yr cycle' },
        { planet: 'Saturn',  sign: 'Aries',       date: '2025-03-29', note: 'Saturn in Aries — discipline, karmic pressure on action' },
        { planet: 'Saturn',  sign: 'Pisces',      date: '2025-03-29', note: 'Saturn in Pisces' },
        { planet: 'Rahu',    sign: 'Aquarius',    date: '2025-05-18', note: 'Rahu in Aquarius — ambition toward networks and technology' },
        { planet: 'Ketu',    sign: 'Leo',         date: '2025-05-18', note: 'Ketu in Leo — spiritual detachment from ego, fame' },
        { planet: 'Mars',    sign: 'Cancer',      date: '2026-02-23', note: 'Mars in Cancer — high-energy home/emotional focus' },
        { planet: 'Mars',    sign: 'Leo',         date: '2026-04-11', note: 'Mars in Leo — bold self-expression, career momentum' },
        { planet: 'Mars',    sign: 'Virgo',       date: '2026-05-27', note: 'Mars in Virgo — precision, health, service-oriented action' },
        { planet: 'Mars',    sign: 'Libra',       date: '2026-07-13', note: 'Mars in Libra — partnerships, contracts, assertive diplomacy' },
        { planet: 'Mars',    sign: 'Scorpio',     date: '2026-09-01', note: 'Mars in Scorpio — depth, investigation, hidden resources' },
        { planet: 'Mars',    sign: 'Sagittarius', date: '2026-10-18', note: 'Mars in Sagittarius — expansion, philosophy, long-distance action' },
        { planet: 'Mars',    sign: 'Capricorn',   date: '2026-12-01', note: 'Mars exalted in Capricorn — peak professional drive' },
        { planet: 'Sun',     sign: 'Aries',       date: '2026-04-14', note: 'Sun enters Aries (sidereal) — solar new year, identity surge' },
        { planet: 'Sun',     sign: 'Taurus',      date: '2026-05-15', note: 'Sun in Taurus — stabilisation, financial focus' },
        { planet: 'Sun',     sign: 'Gemini',      date: '2026-06-15', note: 'Sun in Gemini — communication, learning peaks' },
        { planet: 'Sun',     sign: 'Cancer',      date: '2026-07-16', note: 'Sun in Cancer — home, emotions, nurturing' },
        { planet: 'Sun',     sign: 'Leo',         date: '2026-08-17', note: 'Sun in Leo (own sign) — leadership, authority at peak' },
        { planet: 'Sun',     sign: 'Virgo',       date: '2026-09-17', note: 'Sun in Virgo — analysis, health, service' },
        { planet: 'Sun',     sign: 'Libra',       date: '2026-10-17', note: 'Sun debilitated in Libra — compromise, partnership focus' },
        { planet: 'Sun',     sign: 'Scorpio',     date: '2026-11-16', note: 'Sun in Scorpio — depth, hidden matters surface' },
        { planet: 'Sun',     sign: 'Sagittarius', date: '2026-12-16', note: 'Sun in Sagittarius — expansion, optimism, dharma' },
      ];
      const SIGNS_WHEEL = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
      const houseFromLagna = (sign: string, lagnaSign: string) => {
        const li = SIGNS_WHEEL.indexOf(lagnaSign);
        const si = SIGNS_WHEEL.indexOf(sign);
        if (li < 0 || si < 0) return 0;
        return ((si - li + 12) % 12) + 1;
      };
      const ingressByMonth: Record<string, string[]> = {};
      for (const ing of KNOWN_INGRESSES_2026) {
        const ym = ing.date.substring(0, 7);
        const house = houseFromLagna(ing.sign, lagna);
        const d = new Date(ing.date);
        const dayStr = d.toLocaleString('default', { month: 'short', day: 'numeric' });
        let hint = \`\${ing.planet} enters \${ing.sign} \${dayStr}\`;
        if (house > 0) hint += \` (H\${house} for \${lagna} lagna)\`;
        if (!ingressByMonth[ym]) ingressByMonth[ym] = [];
        ingressByMonth[ym].push(hint);
      }
      type PlanetPos = { sign: string; house: number; degree: number };
      type PlanetPositions = { planets?: Record<string, PlanetPos> };
      for (let di = 1; di < forecastDays.length; di++) {
        const prev = forecastDays[di - 1];
        const curr = forecastDays[di];
        const pp = curr.planet_positions as PlanetPositions | undefined;
        const prevPp = prev.planet_positions as PlanetPositions | undefined;
        if (!pp?.planets || !prevPp?.planets) continue;
        for (const planet of ['Sun', 'Mars', 'Jupiter', 'Saturn']) {
          const currSign = pp.planets[planet]?.sign;
          const prevSign = prevPp.planets[planet]?.sign;
          if (currSign && prevSign && currSign !== prevSign) {
            const ym = curr.date.substring(0, 7);
            const house = houseFromLagna(currSign, lagna);
            const d = new Date(curr.date);
            const dayStr = d.toLocaleString('default', { month: 'short', day: 'numeric' });
            let hint = \`\${planet} enters \${currSign} \${dayStr}\`;
            if (house > 0) hint += \` (H\${house} for \${lagna} lagna)\`;
            if (!ingressByMonth[ym]) ingressByMonth[ym] = [];
            if (!ingressByMonth[ym].some(h => h.startsWith(\`\${planet} enters \${currSign}\`))) {
              ingressByMonth[ym].push(hint);
            }
          }
        }
      }
      const allMonths = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        const ym = d.toISOString().substring(0, 7);
        const hints = ingressByMonth[ym] ?? [];
        return { month_label: d.toLocaleString('default', { month: 'long', year: 'numeric' }), month_index: i, key_transits_hint: hints.join('; ') };
      });
      const refPayload = {
        lagnaSign: ephemerisData.lagna, mahadasha, antardasha,
        startMonth: forecastDays[0].date.substring(0, 7),
        reference_planet_positions: forecastDays[0]?.planet_positions,
        reference_planet_positions_date: forecastDays[0]?.date,
        reference_panchang: forecastDays[0]?.panchang,
        reference_rahu_kaal: forecastDays[0]?.rahu_kaal,
        reference_slots: forecastDays[0]?.slots?.map((s) => ({ display_label: s.display_label, score: s.score, dominant_choghadiya: s.dominant_choghadiya })),
      };

      const processMonthResult = (m: MonthApiResult) => {
        const label = m.month_label ?? m.month ?? '';
        const overall = m.overall_score ?? m.score ?? 65;
        const rawComment = (m.analysis ?? m.commentary ?? '').trim();
        return {
          month: label, score: overall, overall_score: overall, theme: (m.theme ?? '').trim() || '',
          key_transits: m.key_transits ?? [], commentary: rawComment || monthlyFallback(label || 'This month', overall),
          weekly_scores: m.weekly_scores ?? [65, 65, 65, 65],
          domain_scores: { career: m.career_score ?? 65, money: m.money_score ?? 65, health: m.health_score ?? 65, relationships: m.love_score ?? 65 },
        } satisfies MonthSummary;
      };

      // ── commentary_months_1 ─────────────────────────────────────────────────────
      if (phaseAtOrAfter(cp, 'commentary_months_1') && pipelineState.commentary_months_1?.months1Data) {
        months1Data = pipelineState.commentary_months_1.months1Data as MonthSummary[];
      } else {
        await (async () => {
          onStep({ type: 'step_started', step: 5, message: 'Building monthly forecast...', detail: 'Generating months 1-6' });
          void dbSetProgress(PHASE.MONTHS_SYNTHESIS, 71);
          try {
            const m1Res = await commentaryLimit(() => traceAgentRun('months-first', 'llm', () => fetch(\`\${base}/api/commentary/months-first\`, {
              method: 'POST', headers: h, signal: AbortSignal.any([AbortSignal.timeout(200_000), budgetSignal]),
              body: JSON.stringify({ ...refPayload, months: allMonths.slice(0, 6) }),
            })));
            assertNoPartialLlmForPaid(m1Res, 'months-first', input);
            const raw1: MonthApiResult[] = m1Res.ok ? ((await m1Res.json()).months ?? []) : [];
            months1Data = raw1.map(processMonthResult);
          } catch (e) {
            terr('[orchestrator][STEP-7.1] failed:', e instanceof Error ? e.message : String(e));
            if (!allowPartialLlmFallbackForPlan(input)) throw e instanceof Error ? e : new Error(String(e));
            months1Data = Array.from({ length: 6 }, (_, i) => {
              const m = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
              const ml = m.toLocaleString('default', { month: 'long', year: 'numeric' });
              return { month: ml, score: 65, overall_score: 65, theme: '', key_transits: [], commentary: monthlyFallback(ml, 65), weekly_scores: [65, 65, 65, 65], domain_scores: { career: 65, money: 65, health: 65, relationships: 65 } };
            });
          }
        })();
        await savePipelineCheckpoint(db, reportId, userId, 'commentary_months_1', { commentary_months_1: { months1Data } }, pipelineState);
        pipelineState = { ...pipelineState, commentary_months_1: { months1Data } };
      }
      maybeStopAfter('commentary_months_1');

      // ── commentary_months_2 ─────────────────────────────────────────────────────
      if (phaseAtOrAfter(cp, 'commentary_months_2') && pipelineState.commentary_months_2?.allMonthsData) {
        allMonthsData = pipelineState.commentary_months_2.allMonthsData as MonthSummary[];
      } else {
        await (async () => {
          onStep({ type: 'step_started', step: 5, message: 'Building monthly forecast...', detail: 'Generating months 7-12' });
          void dbSetProgress(PHASE.MONTHS_SYNTHESIS, 75);
          let months2Data: MonthSummary[] = [];
          try {
            const m2Res = await commentaryLimit(() => traceAgentRun('months-second', 'llm', () => fetch(\`\${base}/api/commentary/months-second\`, {
              method: 'POST', headers: h, signal: AbortSignal.any([AbortSignal.timeout(200_000), budgetSignal]),
              body: JSON.stringify({ ...refPayload, months: allMonths.slice(6, 12) }),
            })));
            assertNoPartialLlmForPaid(m2Res, 'months-second', input);
            const raw2: MonthApiResult[] = m2Res.ok ? ((await m2Res.json()).months ?? []) : [];
            months2Data = raw2.map(processMonthResult);
          } catch (e) {
            terr('[orchestrator][STEP-7.2] failed:', e instanceof Error ? e.message : String(e));
            if (!allowPartialLlmFallbackForPlan(input)) throw e instanceof Error ? e : new Error(String(e));
            months2Data = Array.from({ length: 6 }, (_, i) => {
              const m = new Date(startDate.getFullYear(), startDate.getMonth() + 6 + i, 1);
              const ml = m.toLocaleString('default', { month: 'long', year: 'numeric' });
              return { month: ml, score: 65, overall_score: 65, theme: '', key_transits: [], commentary: monthlyFallback(ml, 65), weekly_scores: [65, 65, 65, 65], domain_scores: { career: 65, money: 65, health: 65, relationships: 65 } };
            });
          }
          
          allMonthsData = [...months1Data, ...months2Data];
          while (allMonthsData.length < 12) {
            const m = new Date(startDate.getFullYear(), startDate.getMonth() + allMonthsData.length, 1);
            const ml = m.toLocaleString('default', { month: 'long', year: 'numeric' });
            allMonthsData.push({ month: ml, score: 65, overall_score: 65, theme: '', key_transits: [], commentary: monthlyFallback(ml, 65), weekly_scores: [65, 65, 65, 65], domain_scores: { career: 65, money: 65, health: 65, relationships: 65 } });
          }
          onStep({ type: 'partial_report_updated', field: 'months' });
        })();
        await savePipelineCheckpoint(db, reportId, userId, 'commentary_months_2', { commentary_months_2: { allMonthsData } }, pipelineState);
        pipelineState = { ...pipelineState, commentary_months_2: { allMonthsData } };
      }
      maybeStopAfter('commentary_months_2');
\n`;

code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
fs.writeFileSync(file, code);
console.log('Successfully refactored commentary_months.');
