/**
 * L5 — PAID. The spend ladder, and the export a human pastes into Ads Manager.
 *
 * Ported 2026-09-06 from the parallel build (`marketing-engine/src/loops/paid.ts`) and re-cut so
 * that every number comes from production, not from a snapshot table that something else filled
 * in. The source read `funnel_snapshots.paying_customers` out of its own SQLite; if nothing had
 * written that row, the ladder was reasoning about a zero it invented. Here `paying` and `ltv`
 * are read live from Supabase `ziina_payments` where `status='completed'`, and if that read fails
 * the loop refuses to produce a decision rather than defaulting to a comfortable one.
 *
 * LTV is the mean amount an actual paying customer has actually paid us. There is no
 * `subscriptions` table in this product — it sells one-off reports — so a 12-month subscription
 * life is not assumed, imputed, or extrapolated. This is the same rule POLICY.md fixes.
 *
 * THIS LOOP NEVER SPENDS AND NEVER TOUCHES AN AD PLATFORM. It writes files. A person opens Ads
 * Manager, a person imports the CSV, a person sets the budget. There is no API token here on
 * purpose.
 *
 * Under HOLD the import CSVs are deliberately NOT written. They are the artifact whose only use
 * is to start spending, and producing them while the ladder says hold is precisely the temptation
 * the ladder exists to remove. The builders stay exported and unit-tested, so the capability is
 * present and proven the day the gate opens.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { logRun, ROOT } from '../db/index';
import { isKilled, killInfo } from '../safety/killswitch';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { BRAND, utm } from '../brand';
import { resolveSupabase, sbGet } from '../supabase';

export const ADS_OUT = resolve(ROOT, 'output', 'ads');

/** Genuine paying customers required before any money may be spent on ads. */
export const VALIDATE_GATE = 5;
/** Paying customers required before SCALE may be considered. */
export const SCALE_GATE = 20;
/** Hard kill: CAC above this multiple of observed LTV. */
export const CAC_STOP_MULTIPLE = 0.5;
/** Headroom required to keep scaling. */
export const CAC_SCALE_MULTIPLE = 0.3;

export type SpendStatus = 'hold' | 'validate' | 'scale' | 'stop';

export interface SpendDecision {
  status: SpendStatus;
  paying: number;
  trials: number;
  /**
   * Mean amount an actual paying customer has actually paid, in MAJOR units (rupees, dollars,
   * dirhams) of `currency`. null when nobody has paid, or when it cannot be denominated.
   */
  ltv: number | null;
  /** The currency `ltv` and `cacCeiling` are quoted in. null means they are not quotable. */
  currency: string | null;
  /** Observed cost per acquisition from real ad spend. null while no ad has ever run. */
  observedCac: number | null;
  /** The CAC we must stay under at this rung. null when no rung permits spend. */
  cacCeiling: number | null;
  headline: string;
  reasoning: string;
  stopConditions: string[];
}

/**
 * The exact conditions under which spend stops. Written out at every rung, including HOLD, so
 * the owner reads the same kill list before the first rupee as after it.
 */
export const STOP_CONDITIONS: string[] = [
  `CAC rises above ${CAC_STOP_MULTIPLE} x observed LTV — stop that day, do not "give it a week".`,
  '3 Meta or Google policy disapprovals within 7 days — stop and fix the copy, do not appeal in bulk.',
  'Frequency above 3 and CTR down 40% against week 1 — the audience is saturated; stop.',
  'Trial-to-paid below 10% after 100 attributed trials — the funnel, not the ad, is the problem.',
  'Any health, legal, financial, or outcome claim reaches a live creative — kill the ad immediately, do not appeal.',
  'Landing page stops matching the ad (ad shows hour slots, page shows checkout) — stop until it matches.',
];

/**
 * The ladder. Pure, so it is fully unit-testable and so no live read can change what a given set
 * of facts means.
 *
 * `ltv` and `observedCac` are MAJOR units (rupees, not paise) of `currency`, and `currency` is
 * required whenever `ltv` is a number: a CAC ceiling with no denomination is a number a human
 * pastes into Ads Manager against whatever unit they assume, which is the one mistake this
 * ladder cannot be allowed to make. Quoting an undenominated ceiling is refused, not guessed.
 */
export function spendLadder(input: {
  paying: number;
  trials: number;
  ltv: number | null;
  currency?: string | null;
  observedCac?: number | null;
}): SpendDecision {
  const { paying, trials } = input;
  const ltv = input.ltv;
  const currency = input.currency ?? null;
  const observedCac = input.observedCac ?? null;
  const base = { paying, trials, ltv, currency, observedCac, stopConditions: STOP_CONDITIONS };

  if (paying < VALIDATE_GATE) {
    return {
      ...base,
      status: 'hold',
      cacCeiling: null,
      headline: `HOLD — ${paying} paying customer(s), gate is ${VALIDATE_GATE}.`,
      reasoning:
        `Ads multiply a conversion rate; they cannot create one. With ${paying} completed payment(s) there is no ` +
        `rate to multiply, so every rupee spent buys traffic into a funnel we have not yet proven converts. ` +
        `The next ${VALIDATE_GATE - paying} customer(s) have to come from something that costs nothing: organic, ` +
        `the free tools, outreach. No import CSV is written at this rung.`,
    };
  }

  if (ltv == null || !(ltv > 0)) {
    return {
      ...base,
      status: 'hold',
      cacCeiling: null,
      headline: 'HOLD — paying customers exist but LTV cannot be computed from real payments.',
      reasoning:
        'A CAC ceiling is a fraction of LTV. Without an LTV computed from completed payments there is no ceiling, ' +
        'and a budget with no ceiling is not a budget. Fix the payments read before spending.',
    };
  }

  if (!currency) {
    return {
      ...base,
      ltv: null,
      status: 'hold',
      cacCeiling: null,
      headline: `HOLD — LTV ${ltv.toFixed(2)} has no currency, so no ceiling can be quoted.`,
      reasoning:
        'An LTV arrives without a currency when completed payments span more than one (rupees and dollars ' +
        'summed together mean nothing), so the mean is not a price and half of it is not a CAC ceiling. ' +
        'Compute LTV per currency and run one ladder per market before spending.',
    };
  }

  // Every figure the owner reads carries its currency, so a ceiling can never be mistaken for a
  // different unit than the one it was computed in.
  const money = (n: number) => `${currency} ${n.toFixed(2)}`;

  if (observedCac != null && observedCac > CAC_STOP_MULTIPLE * ltv) {
    return {
      ...base,
      status: 'stop',
      cacCeiling: CAC_STOP_MULTIPLE * ltv,
      headline: `STOP — observed CAC ${money(observedCac)} exceeds ${CAC_STOP_MULTIPLE} x LTV ${money(ltv)}.`,
      reasoning: 'Every additional impression is bought at a loss. Pause the campaigns today.',
    };
  }

  if (paying >= SCALE_GATE && observedCac != null && observedCac < CAC_SCALE_MULTIPLE * ltv) {
    return {
      ...base,
      status: 'scale',
      cacCeiling: CAC_SCALE_MULTIPLE * ltv,
      headline: `SCALE — CAC ${money(observedCac)} is under ${CAC_SCALE_MULTIPLE} x LTV ${money(ltv)}.`,
      reasoning:
        `Raise budget by at most 20% per week while CAC stays under ${money(CAC_SCALE_MULTIPLE * ltv)}. ` +
        'You raise it, in Ads Manager. This engine still does not spend.',
    };
  }

  return {
    ...base,
    status: 'validate',
    cacCeiling: CAC_STOP_MULTIPLE * ltv,
    headline: `VALIDATE — ${paying} paying, LTV ${money(ltv)}. Small, capped, killable.`,
    reasoning:
      `Two or three creatives, one landing page (${BRAND.links.sampleReport}), a daily cap you set yourself. ` +
      `Stop the moment CAC passes ${money(CAC_STOP_MULTIPLE * ltv)}. Do not scale off a good first week.`,
  };
}

// ---------------------------------------------------------------- real facts

export interface PaidFacts {
  paying: number;
  trials: number;
  /** MAJOR units (rupees / dollars) of `currency`. null when it cannot be denominated. */
  ltv: number | null;
  currency: string | null;
  /** MAJOR units of `currency`. null when completed payments span more than one currency. */
  grossRevenue: number | null;
  /** Gross revenue per currency, MAJOR units — always populated, even when mixed. */
  revenueByCurrency: Record<string, number>;
  /** true when the count could not be established exactly. */
  trialsUnknown: boolean;
  source: string;
}

/**
 * `ziina_payments.amount` is stored in BASE units, straight off the Ziina intent (paise, cents,
 * fils — see src/lib/ziina/amounts.ts in the app). Every currency this product sells in divides
 * into 100, so one divisor covers them all. Without this the ladder quoted a Rs 799 sale as an
 * LTV of 79900 and a CAC ceiling of 39950 — a hundred times the real one.
 */
export const BASE_UNITS_PER_MAJOR = 100;

export interface CompletedPaymentRow {
  id: string;
  user_id: string | null;
  report_id: string | null;
  /** BASE units, as stored. */
  amount: number | null;
  currency: string | null;
}

/**
 * Turn completed payment rows into the facts the ladder reasons about. Pure, so the unit and
 * mixed-currency rules below are provable without a network call.
 *
 * Distinct paying identity, so one person buying twice is one customer with a higher LTV, not two
 * customers. Amounts of different currencies are NEVER summed into one figure: rupees plus
 * dollars is not an amount of anything, and half of it is not a CAC ceiling. When more than one
 * currency has paid, the per-currency breakdown is still reported but `ltv` is withheld, which
 * lands the ladder on HOLD instead of on a confident number nobody can spend against.
 */
export function summarizePayments(rows: CompletedPaymentRow[]): {
  paying: number;
  ltv: number | null;
  currency: string | null;
  grossRevenue: number | null;
  revenueByCurrency: Record<string, number>;
} {
  const customers = new Set<string>();
  const baseByCurrency = new Map<string, number>();
  for (const r of rows) {
    customers.add(r.user_id || r.report_id || r.id);
    const amt = typeof r.amount === 'number' && Number.isFinite(r.amount) ? r.amount : 0;
    // An amount with no currency code cannot be attributed to a market, so it counts toward the
    // customer but never toward a revenue figure that a price is derived from.
    if (!r.currency) continue;
    baseByCurrency.set(r.currency, (baseByCurrency.get(r.currency) ?? 0) + amt);
  }

  const revenueByCurrency: Record<string, number> = {};
  for (const [code, base] of baseByCurrency) {
    revenueByCurrency[code] = base / BASE_UNITS_PER_MAJOR;
  }

  const paying = customers.size;
  const codes = [...baseByCurrency.keys()];
  const singleCurrency = codes.length === 1 ? codes[0] : null;
  const grossRevenue = singleCurrency ? revenueByCurrency[singleCurrency] : null;

  return {
    paying,
    ltv: singleCurrency && paying ? grossRevenue! / paying : null,
    currency: singleCurrency,
    grossRevenue,
    revenueByCurrency,
  };
}

/**
 * Exact row count via PostgREST's `Prefer: count=exact` + Content-Range, because a length check on
 * a capped result set is a wrong number that looks like a right one. Returns -1 when unknown, and
 * the caller says "unknown" rather than "0".
 */
async function exactCount(sb: { base: string; key: string }, table: string): Promise<number> {
  try {
    const res = await fetch(`${sb.base}/rest/v1/${table}?select=id&limit=1`, {
      headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}`, Prefer: 'count=exact' },
    });
    if (!res.ok) return -1;
    const total = /\/(\d+)$/.exec(res.headers.get('content-range') ?? '')?.[1];
    return total ? Number(total) : -1;
  } catch {
    return -1;
  }
}

/** PostgREST's max-rows on this project. A plain select silently stops here. */
const PAGE = 1000;
/** Refuse to reason about more than this rather than page forever on a runaway table. */
const MAX_PAYMENT_ROWS = 100_000;

/**
 * Every completed payment, paged. The unpaged select this replaced was capped at PostgREST's
 * max-rows, so past 1000 completed payments it would have understated both the customer count and
 * revenue while looking exactly as authoritative — the same trap `exactCount` exists to avoid for
 * `reports`.
 */
async function readCompletedPayments(
  sb: { base: string; key: string },
): Promise<{ rows: CompletedPaymentRow[]; truncated: boolean }> {
  const rows: CompletedPaymentRow[] = [];
  for (let offset = 0; offset < MAX_PAYMENT_ROWS; offset += PAGE) {
    const page = (await sbGet(
      sb,
      'ziina_payments?select=id,user_id,report_id,amount,currency&status=eq.completed' +
        `&order=created_at.asc&limit=${PAGE}&offset=${offset}`,
    )) as CompletedPaymentRow[] | null;
    rows.push(...(page ?? []));
    if (!page || page.length < PAGE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

/**
 * Paying customers and LTV from production, in the currency they were actually paid in.
 */
export async function readPaidFacts(): Promise<PaidFacts> {
  const sb = await resolveSupabase();
  if (!sb) throw new Error('no Supabase service-role credentials — refusing to guess paying-customer counts');

  const { rows, truncated } = await readCompletedPayments(sb);
  const summary = summarizePayments(rows);

  // PostgREST caps a plain select at the server's max-rows (1000 here), so counting the returned
  // array would have reported "1000 reports" forever and called it a fact. Ask for the exact count
  // in the Content-Range header instead.
  const trials = await exactCount(sb, 'reports');

  const mixed = Object.keys(summary.revenueByCurrency).length > 1;
  return {
    paying: summary.paying,
    trials,
    ltv: summary.ltv,
    currency: summary.currency,
    grossRevenue: summary.grossRevenue,
    revenueByCurrency: summary.revenueByCurrency,
    trialsUnknown: trials < 0,
    source:
      `Supabase ziina_payments status=completed (${rows.length} row(s), amounts converted from base units)` +
      (mixed ? ` — ${Object.keys(summary.revenueByCurrency).join('/')} both present, so no single LTV` : '') +
      (truncated ? ` — TRUNCATED at ${MAX_PAYMENT_ROWS} rows` : ''),
  };
}

// ---------------------------------------------------------------- exports

export interface AdVariant {
  name: string;
  primary: string;
  headline: string;
  description: string;
}

function csv(s: unknown): string {
  return `"${String(s ?? '').replace(/"/g, '""')}"`;
}

/** Meta Ads Manager bulk-import sheet. Pure — tested without touching disk. */
export function buildMetaCsv(ads: AdVariant[], landing: string): string {
  return [
    ['campaign', 'adset', 'ad', 'primary_text', 'headline', 'description', 'landing', 'ai_disclosure_flag'],
    ...ads.map((a) => [
      'VH-timing-IN',
      'broad-IN-28-60-no-personal-attribute-targeting',
      a.name,
      a.primary,
      a.headline,
      a.description,
      landing,
      'CONFIRM in Ads Manager: if any voice or visual is AI-generated, tick the AI-generated disclosure',
    ]),
  ]
    .map((row) => row.map(csv).join(','))
    .join('\n');
}

/** Google Ads Editor responsive-search-ad sheet. Field limits are Google's, enforced here. */
export function buildGoogleCsv(ads: AdVariant[], landing: string): string {
  return [
    ['Campaign', 'Headline 1', 'Headline 2', 'Headline 3', 'Description 1', 'Description 2', 'Final URL'],
    ...ads.map((a) => [
      'VH-Search-Timing',
      a.headline.slice(0, 30),
      'VedicHour',
      'Hour by hour',
      a.primary.slice(0, 90),
      BRAND.disclaimer.slice(0, 90),
      landing,
    ]),
  ]
    .map((row) => row.map(csv).join(','))
    .join('\n');
}

/** The account skeleton a person builds by hand, with the policy landmines named inline. */
export function campaignStructure(decision: SpendDecision, landing: string) {
  return {
    _law: 'Export only. This engine has no ad-platform token and never spends. A human imports and a human sets the budget.',
    meta: {
      campaign: 'VH-timing-IN',
      objective: 'Sales, with trial_start as the custom event once server-side CAPI is live',
      targeting:
        'India, 28-60, broad. No detailed targeting on religion or astrology interest — Meta treats that as ' +
        'asserting a personal attribute of the viewer. Let the creative qualify the audience.',
      specialAdCategory: 'none — never file this under housing, credit, or employment',
      landing,
      landingRule: 'The ad shows hour slots, so the landing page must show hour slots. Never /pricing, never /checkout.',
    },
    google: {
      campaign: 'VH-Search-Timing',
      keywordsPositive: ['muhurat', 'hora timing', 'kundli hourly', 'vedic timing app'],
      keywordsNegative: ['free kundli pdf', 'black magic', 'get ex back', 'lottery', 'vashikaran'],
      children: 'Astrology ads are restricted from serving to children globally. Do not target under 18.',
    },
    capi: {
      send: ['page_view', 'trial_start', 'subscribe'],
      neverSend: ['birth_date', 'birth_time', 'birth_place', 'personal_context', 'name'],
      dedup: 'event_id, plus fbp/fbc when the browser supplies them',
    },
    spend: decision,
  };
}

// ---------------------------------------------------------------- the loop

export async function runPaidLoop(): Promise<SpendDecision | null> {
  const loop = 'paid';
  if (isKilled()) {
    console.log(`[paid] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return null;
  }
  logRun({ loop, status: 'started' });
  const t0 = Date.now();

  const facts = await readPaidFacts();
  // No ad account has ever run, so there is no observed CAC. It is null, never a placeholder.
  const decision = spendLadder({ ...facts, observedCac: null });

  mkdirSync(ADS_OUT, { recursive: true });
  const landing = utm(BRAND.links.sampleReport, 'meta', 'paid', 'validate');
  const structure = campaignStructure(decision, landing);
  writeFileSync(resolve(ADS_OUT, 'structure.json'), JSON.stringify(structure, null, 2));

  const written = [resolve(ADS_OUT, 'structure.json')];
  if (decision.status === 'hold' || decision.status === 'stop') {
    writeFileSync(
      resolve(ADS_OUT, 'README.md'),
      [
        `# Paid is ${decision.status.toUpperCase()} — no import file was written`,
        '',
        decision.headline,
        '',
        decision.reasoning,
        '',
        '## What unlocks the import CSVs',
        '',
        `${VALIDATE_GATE} genuine paying customers in \`ziina_payments\` with \`status='completed'\`, ` +
          `and an LTV computed from those payments. Today: ${facts.paying}.`,
        '',
        '## The stop list (read it before the first rupee, not after)',
        '',
        ...STOP_CONDITIONS.map((c) => `- ${c}`),
        '',
      ].join('\n'),
    );
    written.push(resolve(ADS_OUT, 'README.md'));
  } else {
    const ads: AdVariant[] = [];
    writeFileSync(resolve(ADS_OUT, 'meta-import.csv'), buildMetaCsv(ads, landing));
    writeFileSync(resolve(ADS_OUT, 'google-rsa.csv'), buildGoogleCsv(ads, landing));
    written.push(resolve(ADS_OUT, 'meta-import.csv'), resolve(ADS_OUT, 'google-rsa.csv'));
  }

  const revenueLine = Object.entries(facts.revenueByCurrency)
    .map(([code, amt]) => `${code} ${amt.toFixed(2)}`)
    .join(' + ');
  console.log(`[paid] ${decision.headline}`);
  console.log(`[paid] facts: ${facts.paying} paying · ${facts.trialsUnknown ? 'unknown' : facts.trials} report(s) · ` +
    `LTV ${facts.ltv == null ? 'n/a' : `${facts.currency} ${facts.ltv.toFixed(2)}`} · ` +
    `revenue ${revenueLine || 'none'} · observed CAC n/a (no ad has ever run)`);
  console.log(`[paid] source: ${facts.source}`);
  console.log(`[paid] ${decision.reasoning}`);
  console.log('[paid] stop conditions:');
  for (const c of decision.stopConditions) console.log(`         - ${c}`);
  console.log(`[paid] wrote: ${written.join(', ')}`);
  console.log('[paid] no ad account was touched. This engine has no ad-platform token and cannot spend.');

  logRun({
    loop,
    status: 'ok',
    detail: `${decision.status}: ${facts.paying} paying, ltv ${facts.ltv ?? 'n/a'}`,
    duration_ms: Date.now() - t0,
  });
  writeHeartbeat(loop, `${decision.status} (${facts.paying} paying)`);
  return decision;
}
