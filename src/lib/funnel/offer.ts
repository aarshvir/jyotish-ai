/**
 * Server-side switch for selling the ₹199 Karmic Blueprint (spec S17).
 *
 * Off by default. The generator now exists (src/lib/blueprint: engine facts → model
 * narrative → content lint, built by the `blueprint/generate` Inngest job after payment, shown
 * at /report/{id}), but turning sales on is the owner's decision (BLUEPRINT_SALES_ENABLED=1 in
 * Vercel). Before flipping it, run `npx tsx scripts/blueprint-dry-run.ts` against invented
 * profiles and read the output, and check that INNGEST_EVENT_KEY is set in production.
 */
export function blueprintSalesOpen(): boolean {
  return (process.env.BLUEPRINT_SALES_ENABLED ?? '').trim() === '1';
}

export const BLUEPRINT_PLANS = new Set(['blueprint', 'blueprint_plus30']);
