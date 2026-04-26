import re
import sys

def main():
    with open('src/lib/reports/orchestrator.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start of the `else {` block for the commentary
    # around line 1116: `    } else {\n    onStep({ type: 'step_started', step: 3`
    
    start_pattern = r"    } else \{\n\s*onStep\(\{ type: 'step_started', step: 3, message: 'Writing daily commentary\.\.\.', detail: 'Analyzing each day with your birth chart' \}\);\n\n\s*await Promise\.all\(\[\n\s*// Steps 4\+5: Daily overviews \+ Nativity text\n\s*\(async \(\) => \{"
    
    match = re.search(start_pattern, content)
    if not match:
        print("Could not find start of Promise.all block")
        sys.exit(1)
        
    start_idx = match.start()
    
    # We will replace the Promise.all and the 3 IIFEs with sequential blocks.
    # We need to extract the bodies of the 3 IIFEs.
    
    # Let's just use string replacement on known boundaries.
    
    # 1. Replace the `await Promise.all([` with sequential execution setup
    replacement_start = """    } else {
      // --- COMMENTARY SEQUENTIAL EXECUTION (Hobby-Safe) ---
      // Block 1: Daily Overviews + Nativity Text
      if (phaseAtOrAfter(existingCheckpoint, 'commentary_daily') && pipelineState.commentary_daily) {
        forecastDays = pipelineState.commentary_daily.forecastDays as ForecastDayIntermediate[];
        const savedNd = pipelineState.commentary_daily.nativityData as NativityData;
        if (savedNd?.lagna_analysis) nativityData.lagna_analysis = savedNd.lagna_analysis;
        if (savedNd?.current_dasha_interpretation) nativityData.current_dasha_interpretation = savedNd.current_dasha_interpretation;
        onStep({ type: 'step_completed', step: 3 });
        logStep('commentary_daily_resumed');
      } else {
        onStep({ type: 'step_started', step: 3, message: 'Writing daily commentary...', detail: 'Analyzing each day with your birth chart' });
"""
    
    content = content.replace(
"""    } else {
    onStep({ type: 'step_started', step: 3, message: 'Writing daily commentary...', detail: 'Analyzing each day with your birth chart' });

    await Promise.all([
      // Steps 4+5: Daily overviews + Nativity text
      (async () => {""", replacement_start)

    # 2. After Block 1, add checkpoint and maybeStopAfter
    block1_end = """        }
      })(),

      // Step 6: Hourly commentary — 3 parallel batches of ~10 days each"""
      
    replacement_1_end = """        }

        await savePipelineCheckpoint(db, reportId, userId, 'commentary_daily', {
          commentary_daily: { forecastDays, nativityData }
        }, pipelineState);
        pipelineState = { ...pipelineState, commentary_daily: { forecastDays, nativityData } };
      }
      maybeStopAfter('commentary_daily');

      // Block 2: Hourly commentary — 3 parallel batches of ~10 days each
      if (phaseAtOrAfter(existingCheckpoint, 'commentary_hourly') && pipelineState.commentary_hourly) {
        forecastDays = pipelineState.commentary_hourly.forecastDays as ForecastDayIntermediate[];
        onStep({ type: 'step_completed', step: 4 });
        logStep('commentary_hourly_resumed');
      } else {"""
      
    content = content.replace(block1_end, replacement_1_end)

    # 3. After Block 2, add checkpoint and maybeStopAfter
    block2_end = """        }
      })(),

      // Step 7: Months synthesis (parallel with weeks/commentary)
      (async () => {"""
      
    replacement_2_end = """        }

        await savePipelineCheckpoint(db, reportId, userId, 'commentary_hourly', {
          commentary_hourly: { forecastDays }
        }, pipelineState);
        pipelineState = { ...pipelineState, commentary_hourly: { forecastDays } };
      }
      maybeStopAfter('commentary_hourly');

      // Block 3: Synthesis (Months + Weeks)
      if (phaseAtOrAfter(existingCheckpoint, 'commentary_synthesis') && pipelineState.commentary_synthesis) {
        allMonthsData = pipelineState.commentary_synthesis.allMonthsData as MonthSummary[];
        weeksSynthData = pipelineState.commentary_synthesis.weeksSynthData as WeeksSynthApiResult;
        onStep({ type: 'step_completed', step: 5 });
        onStep({ type: 'step_completed', step: 6 });
        logStep('commentary_synthesis_resumed');
      } else {
        await Promise.all([
          // Step 7: Months synthesis
          (async () => {"""
          
    content = content.replace(block2_end, replacement_2_end)

    # 4. After Block 3 (Weeks synthesis), end the Promise.all and add checkpoint
    block3_end = """        }
      })(),
    ]);

    const weekCountBeforePad = (weeksSynthData.weeks ?? []).length;"""
    
    replacement_3_end = """        }
      })(),
        ]);

        await savePipelineCheckpoint(db, reportId, userId, 'commentary_synthesis', {
          commentary_synthesis: { allMonthsData, weeksSynthData }
        }, pipelineState);
        pipelineState = { ...pipelineState, commentary_synthesis: { allMonthsData, weeksSynthData } };
      }
      maybeStopAfter('commentary_synthesis');

    } // End of else block for commentary

    const weekCountBeforePad = (weeksSynthData.weeks ?? []).length;"""
    
    content = content.replace(block3_end, replacement_3_end)

    with open('src/lib/reports/orchestrator.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Successfully refactored orchestrator.ts")

if __name__ == '__main__':
    main()
