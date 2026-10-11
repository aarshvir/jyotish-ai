/**
 * Server-side switch for selling the ₹199 Karmic Blueprint (spec S17).
 *
 * Off by default. The blueprint's report generator is spec Phase 4 and does not exist
 * yet, so a paid blueprint could not be delivered. Turn on (BLUEPRINT_SALES_ENABLED=1 in
 * Vercel) only once Phase 4 has shipped and finalizeIntent knows how to deliver it.
 */
export function blueprintSalesOpen(): boolean {
  return (process.env.BLUEPRINT_SALES_ENABLED ?? '').trim() === '1';
}

export const BLUEPRINT_PLANS = new Set(['blueprint', 'blueprint_plus30']);
