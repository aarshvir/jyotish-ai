import { describe, expect, it } from 'vitest';
import { isFreeOrPreviewPlan, normalizePlanType } from '@/lib/reports/planType';

/**
 * Entitlement invariant: whitespace/case variants of free|preview must never
 * escape preview stripping. A padded " free " used to pass the free start gate
 * (trimmed) while the orchestrator/UI treated it as a paid plan (untrimmed).
 */
describe('plan_type canonicalization (preview entitlement)', () => {
  it('trims and lowercases plan_type', () => {
    expect(normalizePlanType(' free ')).toBe('free');
    expect(normalizePlanType('Preview')).toBe('preview');
    expect(normalizePlanType(' 7DAY ')).toBe('7day');
  });

  it('falls back when empty/missing', () => {
    expect(normalizePlanType(undefined)).toBe('7day');
    expect(normalizePlanType(null)).toBe('7day');
    expect(normalizePlanType('   ')).toBe('7day');
    expect(normalizePlanType('', 'preview')).toBe('preview');
  });

  it('recognizes padded free/preview as preview plans', () => {
    for (const raw of ['free', ' preview ', 'FREE', '\tPreview\n', ' free']) {
      expect(isFreeOrPreviewPlan(raw)).toBe(true);
    }
  });

  it('does not treat paid plans as preview even with padding', () => {
    for (const raw of ['7day', ' 7day ', 'monthly', 'annual', 'Monthly ']) {
      expect(isFreeOrPreviewPlan(raw)).toBe(false);
    }
  });
});
