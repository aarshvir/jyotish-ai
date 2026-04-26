const fs = require('fs');
let code = fs.readFileSync('src/lib/reports/orchestrator.ts', 'utf8');

code = code.replace(
  '    await Promise.all([\n      // Steps 4+5: Daily overviews + Nativity text\n      (async () => {',
  `    // --- COMMENTARY SEQUENTIAL EXECUTION ---
    // Block 1: Daily Overviews + Nativity Text
    if (phaseAtOrAfter(existingCheckpoint, 'commentary_daily') && pipelineState.commentary_daily) {
      forecastDays = pipelineState.commentary_daily.forecastDays as ForecastDayIntermediate[];
      const savedNd = pipelineState.commentary_daily.nativityData as NativityData;
      if (savedNd?.lagna_analysis) nativityData.lagna_analysis = savedNd.lagna_analysis;
      if (savedNd?.current_dasha_interpretation) nativityData.current_dasha_interpretation = savedNd.current_dasha_interpretation;
      onStep({ type: 'step_completed', step: 3 });
      logStep('commentary_daily_resumed');
    } else {
      await (async () => {`
);

code = code.replace(
  `        }
      })(),

      // Step 6: Hourly commentary — 3 parallel batches of ~10 days each (3× faster than 1 × 30-day call)
      (async () => {`,
  `        }
      })();
      await savePipelineCheckpoint(db, reportId, userId, 'commentary_daily', {
        commentary_daily: { forecastDays, nativityData }
      }, pipelineState);
      pipelineState = { ...pipelineState, commentary_daily: { forecastDays, nativityData } };
    }
    maybeStopAfter('commentary_daily');

    // Block 2: Hourly commentary
    if (phaseAtOrAfter(existingCheckpoint, 'commentary_hourly') && pipelineState.commentary_hourly) {
      forecastDays = pipelineState.commentary_hourly.forecastDays as ForecastDayIntermediate[];
      onStep({ type: 'step_completed', step: 4 });
      logStep('commentary_hourly_resumed');
    } else {
      await (async () => {`
);

code = code.replace(
  `        }
      })(),

      // Step 7: Monthly
      (async () => {`,
  `        }
      })();
      await savePipelineCheckpoint(db, reportId, userId, 'commentary_hourly', {
        commentary_hourly: { forecastDays }
      }, pipelineState);
      pipelineState = { ...pipelineState, commentary_hourly: { forecastDays } };
    }
    maybeStopAfter('commentary_hourly');

    // Block 3: Synthesis
    if (phaseAtOrAfter(existingCheckpoint, 'commentary_synthesis') && pipelineState.commentary_synthesis) {
      allMonthsData = pipelineState.commentary_synthesis.allMonthsData as MonthSummary[];
      weeksSynthData = pipelineState.commentary_synthesis.weeksSynthData as WeeksSynthApiResult;
      onStep({ type: 'step_completed', step: 5 });
      onStep({ type: 'step_completed', step: 6 });
      logStep('commentary_synthesis_resumed');
    } else {
      await Promise.all([
        // Step 7: Monthly
        (async () => {`
);

code = code.replace(
  `        }
      })(),
    ]);`,
  `        }
      })(),
      ]);
      await savePipelineCheckpoint(db, reportId, userId, 'commentary_synthesis', {
        commentary_synthesis: { allMonthsData, weeksSynthData }
      }, pipelineState);
      pipelineState = { ...pipelineState, commentary_synthesis: { allMonthsData, weeksSynthData } };
    }
    maybeStopAfter('commentary_synthesis');`
);

fs.writeFileSync('src/lib/reports/orchestrator.ts', code);
console.log('Refactored orchestrator.ts successfully');
