import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, logRun } from '../db';
import { OUT_DIR } from '../paths';
import { BRAND, utm } from '../brand';
import type { AdVariant, IdeaRow } from '../copy/fallbacks';

export type SpendStatus = 'hold' | 'validate' | 'scale' | 'stop';

export interface SpendDecision {
  status: SpendStatus;
  paying: number;
  trials: number;
  ltv: number | null;
  cacCeiling: number | null;
  recommendation: string;
  stopConditions: string[];
}

export function spendLadder(paying: number, trials: number, ltv: number | null, observedCac: number | null): SpendDecision {
  const stopConditions = [
    'CAC > 0.5 × observed LTV on the validation cap',
    '3 Meta/Google policy disapprovals in 7 days',
    'Frequency > 3 and CTR down 40% vs week 1',
    'Trial→paid < 10% after 100 attributed trials',
    'Any health/legal/financial outcome claim in creative (do not appeal — kill)',
  ];
  if (paying < 5) {
    return {
      status: 'hold',
      paying,
      trials,
      ltv,
      cacCeiling: null,
      recommendation:
        `HOLD. ${paying} paying customer(s). Ads multiply a conversion rate; they cannot create one. Get a handful of genuine organic paid users first.`,
      stopConditions,
    };
  }
  if (ltv == null || ltv <= 0) {
    return {
      status: 'hold',
      paying,
      trials,
      ltv,
      cacCeiling: null,
      recommendation: 'HOLD. Paying users exist but LTV cannot be computed from actual payments yet. Do not assume a 12-month subscription life.',
      stopConditions,
    };
  }
  const cacCeiling = 0.3 * ltv;
  if (observedCac != null && observedCac > 0.5 * ltv) {
    return {
      status: 'stop',
      paying,
      trials,
      ltv,
      cacCeiling,
      recommendation: `STOP. Observed CAC ${observedCac.toFixed(2)} is above 0.5 × LTV ${ltv.toFixed(2)}.`,
      stopConditions,
    };
  }
  if (observedCac != null && observedCac < cacCeiling && paying >= 20) {
    return {
      status: 'scale',
      paying,
      trials,
      ltv,
      cacCeiling,
      recommendation: `SCALE +20% weekly while CAC stays under ${cacCeiling.toFixed(2)} (0.3 × LTV). You still click the budget in Ads Manager.`,
      stopConditions,
    };
  }
  return {
    status: 'validate',
    paying,
    trials,
    ltv,
    cacCeiling: 0.5 * ltv,
    recommendation: `VALIDATE only. Tiny budget, 2–3 creatives, one landing page (${BRAND.landing.sampleReport}). Cap daily spend yourself. Kill on the stop list.`,
    stopConditions,
  };
}

export async function runPaid(): Promise<{ notes: string[] }> {
  const t0 = Date.now();
  const snap = db()
    .prepare(`SELECT paying_customers, trials, ltv_estimate FROM funnel_snapshots ORDER BY id DESC LIMIT 1`)
    .get() as { paying_customers: number; trials: number; ltv_estimate: number | null } | undefined;
  const paying = snap?.paying_customers ?? 0;
  const trials = snap?.trials ?? 0;
  const ltv = snap?.ltv_estimate ?? null;
  const decision = spendLadder(paying, trials, ltv, null);

  const idea = db()
    .prepare(`SELECT id, slug, title, angle, category, score FROM ideas ORDER BY score DESC LIMIT 1`)
    .get() as IdeaRow | undefined;
  const adsRow = idea
    ? (db().prepare(`SELECT body_json FROM drafts WHERE idea_id=? AND kind='ads' ORDER BY id DESC LIMIT 1`).get(idea.id) as { body_json: string } | undefined)
    : undefined;
  const ads = adsRow ? (JSON.parse(adsRow.body_json) as AdVariant[]) : [];

  const dir = resolve(OUT_DIR, 'ads');
  mkdirSync(dir, { recursive: true });
  const landing = utm(BRAND.landing.sampleReport, 'meta', 'paid', idea?.slug ?? 'hold');

  const metaCsv = [
    ['campaign', 'adset', 'ad', 'primary_text', 'headline', 'description', 'landing', 'ai_disclosure_flag'],
    ...ads.map((a) => [
      'VH-timing-IN',
      'broad-IN-28-60-no-personal-attr',
      a.name,
      a.primary,
      a.headline,
      a.description,
      landing,
      'CONFIRM in Ads Manager: if voice/visual is AI-generated, check the 2026 disclosure box',
    ]),
  ]
    .map((row) => row.map(csv).join(','))
    .join('\n');
  writeFileSync(resolve(dir, 'meta-import.csv'), metaCsv);

  const googleCsv = [
    ['Campaign', 'Headline 1', 'Headline 2', 'Headline 3', 'Description 1', 'Description 2', 'Final URL'],
    ...ads.map((a) => ['VH-Search-Timing', a.headline.slice(0, 30), 'VedicHour', 'Hour by hour', a.primary.slice(0, 90), BRAND.disclaimer.slice(0, 90), landing]),
  ]
    .map((row) => row.map(csv).join(','))
    .join('\n');
  writeFileSync(resolve(dir, 'google-rsa.csv'), googleCsv);

  const structure = {
    meta: {
      campaign: 'VH-timing-IN',
      objective: 'Sales with trial_start as custom event once CAPI is live',
      targeting:
        'India, 28–60, no detailed targeting on religion/astrology-interest if it implies a personal attribute. Let the creative qualify. Advantage+ only after validate.',
      landing,
      specialAdCategory: 'none — do not run housing/credit/employment special category by accident',
    },
    google: {
      campaign: 'VH-Search-Timing',
      keywords_positive: ['muhurat', 'hora timing', 'kundli hourly', 'vedic timing app'],
      keywords_negative: ['free kundli pdf', 'black magic', 'get ex back', 'lottery'],
      children: 'Do not target under 18. Astrology is restricted from serving to children.',
    },
    capi: {
      send: ['trial_start', 'subscribe', 'page_view'],
      never_send: ['birth_date', 'birth_time', 'birth_place', 'personal_context', 'name'],
      dedup: 'event_id + fbp/fbc when present',
    },
    spend: decision,
  };
  writeFileSync(resolve(dir, 'structure.json'), JSON.stringify(structure, null, 2));

  db().prepare(`INSERT INTO campaigns (platform, name, structure_json, spend_status, recommendation) VALUES (?,?,?,?,?)`).run(
    'meta+google',
    'VH-timing-IN',
    JSON.stringify(structure),
    decision.status,
    decision.recommendation,
  );

  const notes = [
    `${decision.status}: ${decision.recommendation}`,
    `export: ${dir}`,
    'No ad is live. You create the ad account and you click import. This engine will not spend.',
  ];
  logRun('paid', 'ok', notes.join(' · '), Date.now() - t0);
  return { notes };
}

function csv(s: string): string {
  const t = String(s ?? '').replace(/"/g, '""');
  return `"${t}"`;
}
