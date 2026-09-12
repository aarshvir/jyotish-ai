import { describe, it, expect } from 'vitest';
import * as b from '@/lib/agents/nativityBudget';

describe('nativity time budget — every inner limit must fit inside the outer one', () => {
  it('orders SDK < route < fetch < Inngest step', () => {
    expect(b.NATIVITY_SDK_TIMEOUT_MS).toBeLessThan(b.NATIVITY_ROUTE_BUDGET_MS);
    expect(b.NATIVITY_ROUTE_BUDGET_MS).toBeLessThan(b.NATIVITY_FETCH_TIMEOUT_MS);
    expect(b.NATIVITY_FETCH_TIMEOUT_MS).toBeLessThan(b.INNGEST_STEP_BUDGET_MS);
  });

  it('leaves Opus 5 margin over the measured real nativity (163 s, 11,164 tokens)', () => {
    expect(b.NATIVITY_SDK_TIMEOUT_MS).toBeGreaterThanOrEqual(163_000 * 1.4);
    expect(b.NATIVITY_MAX_TOKENS).toBeGreaterThanOrEqual(Math.ceil(11_164 * 1.3));
  });

  it('makes one fetch attempt, because a second cannot fit inside the step', () => {
    expect(b.NATIVITY_FETCH_ATTEMPTS).toBe(1);
    expect(b.NATIVITY_FETCH_ATTEMPTS * b.NATIVITY_FETCH_TIMEOUT_MS).toBeLessThan(b.INNGEST_STEP_BUDGET_MS);
  });
});
