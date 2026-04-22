import fs from 'fs';

const BASE    = 'http://localhost:3000';
const BYPASS  = 'VEDICADMIN2026';
const HEADERS = { 'Content-Type': 'application/json', 'x-bypass-token': BYPASS };

async function main() {
  if (!fs.existsSync('scripts/last-scout-id.txt')) {
    console.error('[INSPECTOR] No report ID found from Scout');
    process.exit(1);
  }
  const reportId = fs.readFileSync('scripts/last-scout-id.txt', 'utf8').trim();
  console.log(`[INSPECTOR] Monitoring report ${reportId}`);

  const start = Date.now();
  const MAX_WAIT = 15 * 60 * 1000;

  while (Date.now() - start < MAX_WAIT) {
    const res = await fetch(`${BASE}/api/reports/${reportId}/status`, { headers: HEADERS });
    if (!res.ok) {
      console.log(`[INSPECTOR] Status check failed (${res.status}), retrying...`);
    } else {
      const data = await res.json();
      const elapsed = Math.round((Date.now() - start) / 1000);
      console.log(`[INSPECTOR] [${elapsed}s] status=${data.status} progress=${data.progress}% step="${data.generation_step || ''}"`);

      if (data.status === 'complete' && data.report) {
        console.log(`[INSPECTOR] Report ${reportId} is COMPLETE`);
        fs.writeFileSync('scripts/last-report.json', JSON.stringify(data.report));
        process.exit(0);
      }
      if (data.status === 'error') {
        console.error(`[INSPECTOR] Report ${reportId} FAILED:`, data.error || 'Unknown error');
        process.exit(1);
      }
    }
    await new Promise(r => setTimeout(r, 10000));
  }

  console.error(`[INSPECTOR] Timeout after ${MAX_WAIT/60000}m`);
  process.exit(1);
}

main().catch(err => {
  console.error('[INSPECTOR] Error:', err);
  process.exit(1);
});
