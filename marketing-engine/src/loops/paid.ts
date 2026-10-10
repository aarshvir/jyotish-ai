import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { ENGINE_ROOT } from '../paths';
import { logRun } from '../db';
import { spendDecision } from '../spend';

export interface MeasurementRow {
  payingCustomers: number;
  cacUsd: number | null;
  ltvUsd: number | null;
  d30Retention: number | null;
}

export function latestMeasurement(db: DatabaseSync): MeasurementRow {
  const row = db
    .prepare(
      `SELECT paying_customers, cac_usd, ltv_usd, d30_retention FROM measurements ORDER BY id DESC LIMIT 1`,
    )
    .get() as
    | { paying_customers: number; cac_usd: number | null; ltv_usd: number | null; d30_retention: number | null }
    | undefined;
  if (!row) return { payingCustomers: 0, cacUsd: null, ltvUsd: null, d30Retention: null };
  return {
    payingCustomers: row.paying_customers,
    cacUsd: row.cac_usd,
    ltvUsd: row.ltv_usd,
    d30Retention: row.d30_retention,
  };
}

/** UTM links. Payloads must never carry birth data, name, or the quiz's free-text answer. */
export function utm(path: string, source: string, medium: string, content: string): string {
  const u = new URL(`https://www.vedichour.com${path}`);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', medium);
  u.searchParams.set('utm_campaign', 'timing-grid');
  u.searchParams.set('utm_content', content);
  return u.toString();
}

export const ANALYTICS_ALLOWLIST = ['event_name', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'value_usd', 'currency'] as const;

export function sanitizeAnalytics(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ANALYTICS_ALLOWLIST) {
    if (key in payload) out[key] = payload[key];
  }
  return out;
}

export function runPaid(db: DatabaseSync): void {
  const measured = latestMeasurement(db);
  const decision = spendDecision({
    payingCustomers: measured.payingCustomers,
    cacUsd: measured.cacUsd,
    ltvUsd: measured.ltvUsd,
    d30Retention: measured.d30Retention,
  });
  const dir = resolve(ENGINE_ROOT, 'staged', 'campaigns');
  mkdirSync(dir, { recursive: true });
  const meta = {
    name: 'VedicHour timing grid — do not import until founder approves spend',
    objective: 'traffic',
    dailyBudgetUsd: decision.dailyBudgetUsd,
    specialAdCategory: null,
    targetingNotes: [
      'Do not target by health, relationship status, or financial hardship.',
      'Age suggestion 28–60 is a passing product note, not a personal-attribute line in the ad text.',
      'Landing page: /start. No birth data in the URL.',
    ],
    url: utm('/start', 'meta', 'paid', 'two-slots-same-tuesday'),
    decision,
  };
  const google = {
    name: 'VedicHour search — staged, not live',
    dailyBudgetUsd: decision.dailyBudgetUsd,
    keywords: ['vedic timing', 'planetary hours', 'which time to schedule a meeting'],
    negativeKeywords: ['cure', 'guaranteed job', 'get married', 'pregnancy'],
    url: utm('/start', 'google', 'cpc', 'two-slots-same-tuesday'),
    personalizedAds: 'Do not use customer lists built from birth data or quiz free-text. Astrology is restricted on Made-for-kids inventory.',
    decision,
  };
  writeFileSync(resolve(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  writeFileSync(resolve(dir, 'google.json'), JSON.stringify(google, null, 2));
  logRun(db, 'paid', 'ok', `${decision.stage}: $${decision.dailyBudgetUsd}/day. Files written. Nothing was sent to an ad account.`);
}
