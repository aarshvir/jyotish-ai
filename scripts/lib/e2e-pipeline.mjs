import { fetchJson, sleep } from './e2e-http.mjs';

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;
const START_TIMEOUT_MS = 330_000;

/**
 * @param {string} baseUrl
 * @param {Record<string, string>} headers
 * @param {Record<string, unknown>} testInput
 * @returns {Promise<{ report: unknown; startStatus: number; startBody: unknown; pollSeconds: number }>}
 */
export async function runReportUntilComplete(baseUrl, headers, testInput) {
  const reportId = testInput.reportId;
  const startT = Date.now();
  const startRes = await fetchJson(`${baseUrl}/api/reports/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify(testInput),
    timeoutMs: START_TIMEOUT_MS,
  });

  const pollStart = Date.now();
  let finalReport = null;

  while (true) {
    const pollElapsed = Date.now() - pollStart;
    if (pollElapsed > POLL_TIMEOUT_MS) {
      throw new Error(`Poll timed out after ${Math.round(pollElapsed / 1000)}s for ${reportId}`);
    }

    let pollRes;
    try {
      pollRes = await fetchJson(`${baseUrl}/api/reports/${reportId}/status`, {
        headers,
        timeoutMs: 20_000,
      });
    } catch (e) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (pollRes.status !== 200) {
      throw new Error(
        `Status poll HTTP ${pollRes.status}: ${JSON.stringify(pollRes.body)} for ${reportId}`,
      );
    }

    const d = pollRes.body;
    if (d.status === 'error') {
      throw new Error(`Report error status: ${JSON.stringify(d)}`);
    }

    if (d.status === 'complete' && d.report) {
      finalReport = d.report;
      break;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return {
    report: finalReport,
    startStatus: startRes.status,
    startBody: startRes.body,
    pollSeconds: Math.round((Date.now() - startT) / 1000),
  };
}
