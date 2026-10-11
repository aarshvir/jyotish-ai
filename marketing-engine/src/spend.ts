/** Published monthly price. Minor units in ziina/server.ts: amountUSD 4199 → $41.99. Not an LTV. */
export const MONTHLY_PRICE_USD = 41.99;

export interface SpendInput {
  payingCustomers: number;
  cacUsd: number | null;
  /** Null until D30 retention exists. Never invent this. */
  ltvUsd: number | null;
  d30Retention: number | null;
}

export interface SpendDecision {
  stage: 'hold' | 'stop' | 'validate';
  dailyBudgetUsd: number;
  reason: string;
  /** Founder must approve before any account is funded. The engine never spends. */
  requiresFounderApproval: true;
}

/**
 * Ads multiply a conversion rate. They do not create one.
 * Stop line once LTV is real: CAC must stay under min(0.3 × LTV, one month's price).
 * Until then the budget is zero.
 */
export function spendDecision(input: SpendInput): SpendDecision {
  if (input.payingCustomers < 10) {
    return {
      stage: 'hold',
      dailyBudgetUsd: 0,
      requiresFounderApproval: true,
      reason: `Hold. ${input.payingCustomers} paying subscription periods are in the measurement store. Need 10 organic paying customers before any validation budget. Ads are not a substitute for a working quiz → pay → return loop.`,
    };
  }
  if (input.ltvUsd == null || input.d30Retention == null) {
    return {
      stage: 'hold',
      dailyBudgetUsd: 0,
      requiresFounderApproval: true,
      reason: 'Hold. Ten customers exist but LTV and D30 retention are not measured from subscription_periods. Do not assume LTV from the $41.99 sticker price.',
    };
  }
  const stop = Math.min(input.ltvUsd * 0.3, MONTHLY_PRICE_USD);
  if (input.cacUsd != null && input.cacUsd > stop) {
    return {
      stage: 'stop',
      dailyBudgetUsd: 0,
      requiresFounderApproval: true,
      reason: `Stop. CAC $${input.cacUsd.toFixed(2)} is above $${stop.toFixed(2)} (min of 30% of measured LTV and one month's price).`,
    };
  }
  return {
    stage: 'validate',
    dailyBudgetUsd: 20,
    requiresFounderApproval: true,
    reason: `Validation only: up to $20/day, and only after you approve it. Stop the moment CAC exceeds $${stop.toFixed(2)}. Do not scale past this stage in this engine.`,
  };
}
