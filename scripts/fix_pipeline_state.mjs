import * as fs from 'fs';

// Fix 1: Clear pipeline_state on forceRestart in start route
{
  const file = 'src/app/api/reports/start/route.ts';
  let code = fs.readFileSync(file, 'utf8');
  
  const marker = '  await clearReportGenerationLog(reportId, auth.user.id);\r\n\r\n  const pipelineTime';
  const replacement = `  await clearReportGenerationLog(reportId, auth.user.id);

  // CRITICAL: On forceRestart, wipe pipeline_state so the next run does NOT reuse stale LLM
  // checkpoints from previous failed/partial attempts. Without this, the orchestrator finds
  // months/weeks checkpoints containing fallback text and skips all real LLM calls —
  // producing a report that looks complete but contains 100% template copy.
  if (forceRestart) {
    await db
      .from('reports')
      .update({ pipeline_state: null, updated_at: nowIso })
      .eq('id', reportId)
      .eq('user_id', auth.user.id);
  }

  const pipelineTime`;

  if (!code.includes('await clearReportGenerationLog(reportId, auth.user.id);\r\n\r\n  const pipelineTime')) {
    // Try LF
    const markerLF = '  await clearReportGenerationLog(reportId, auth.user.id);\n\n  const pipelineTime';
    const replacementLF = replacement.replace(/\r/g, '');
    if (code.includes(markerLF)) {
      code = code.replace(markerLF, replacementLF);
      console.log('Fixed with LF');
    } else {
      console.error('Marker not found!');
      process.exit(1);
    }
  } else {
    code = code.replace(marker, replacement);
    console.log('Fixed with CRLF');
  }
  
  fs.writeFileSync(file, code);
  console.log('Fix 1: pipeline_state cleared on forceRestart');
}

// Fix 2: In orchestrator, log when a phase is being restored from checkpoint vs running fresh
{
  const file = 'src/lib/reports/orchestrator.ts';
  let code = fs.readFileSync(file, 'utf8');
  
  // Add better logging for checkpoint restoration so we can detect stale checkpoint usage
  // Find the commentary_months_1 restore block and add a tlog
  const commentaryMonths1Guard = "if (phaseAtOrAfter(cp, 'commentary_months_1') && pipelineState.commentary_months_1?.months1Data) {\n        months1Data = pipelineState.commentary_months_1.months1Data as MonthSummary[];";
  const commentaryMonths1GuardReplacement = "if (phaseAtOrAfter(cp, 'commentary_months_1') && pipelineState.commentary_months_1?.months1Data) {\n        tlog('[orchestrator] Restoring months1Data from checkpoint (skipping LLM)');\n        months1Data = pipelineState.commentary_months_1.months1Data as MonthSummary[];";
  
  if (code.includes(commentaryMonths1Guard)) {
    code = code.replace(commentaryMonths1Guard, commentaryMonths1GuardReplacement);
    console.log('Fix 2: Added checkpoint restore logging for commentary_months_1');
  } else {
    console.warn('Fix 2: commentary_months_1 guard not found (may already be logged)');
  }
  
  fs.writeFileSync(file, code);
}

console.log('All fixes applied successfully.');
