/**
 * BPHS RAG Impact Study
 * Performs A/B comparison of reports to demonstrate the "Grandmaster" improvement.
 */

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const BASE    = 'http://localhost:3000';
const BYPASS  = 'VEDICADMIN2026';
const HEADERS = { 'Content-Type': 'application/json', 'x-bypass-token': BYPASS };

const BIRTH = {
  name:            'Impact Analysis Native',
  birth_date:      '1985-05-20',
  birth_time:      '14:20:00',
  birth_city:      'Delhi, India',
  birth_lat:       28.6139,
  birth_lng:       77.2090,
  current_city:    'New York, USA',
  current_lat:     40.7128,
  current_lng:     -74.0060,
  timezone_offset: -240, 
  plan_type:       '7day',
  payment_status:  'bypass',
};

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...HEADERS, ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function runReport(tag, disableRag) {
  const reportId = randomUUID();
  console.log(`[${tag}] Triggering report ${reportId} (DISABLE_RAG=${disableRag})`);
  
  // Trigger
  await fetchJSON(`${BASE}/api/reports/start`, {
    method: 'POST',
    body: JSON.stringify({ 
      reportId, 
      ...BIRTH, 
      forceRestart: true,
      testOptions: { disableRag } // We'll need to pass this or use env vars
    }),
  });

  // Poll
  console.log(`[${tag}] Polling...`);
  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    const data = await fetchJSON(`${BASE}/api/reports/${reportId}/status`);
    if (data.status === 'complete' && data.report) {
      console.log(`[${tag}] Complete!`);
      return data.report;
    }
    if (data.status === 'error') throw new Error(`Report ${reportId} failed`);
  }
}

async function main() {
  console.log('--- BPHS RAG Impact Study Starting ---\n');
  
  // Note: For this to work with env vars, we might need to toggle the env var 
  // on the server if it supports dynamic envs, but since we are local, 
  // we'll assume the server is running and we can't easily flip its env var 
  // mid-run without a restart. 
  
  // INSTEAD: I will modify the /api/reports/start endpoint to accept a `disableRag` override
  // for testing purposes.
  
  console.log('ERROR: I need to add the override to the start endpoint first.');
}

main();
