import { describe, it, expect } from 'vitest';
import { isProtectedRoute, PROTECTED_PREFIXES } from '@/lib/supabase/protectedRoutes';

/**
 * /onboard was protected from 2026-03-28 until 2026-09-12, which put a signup wall in front of the
 * free Kundli flow that every ranking page promised was "no signup". These lock it open, and lock
 * everything that genuinely holds a user's data shut.
 */
describe('protected routes', () => {
  it('lets logged-out visitors reach the free onboarding flow', () => {
    expect(isProtectedRoute('/onboard')).toBe(false);
    expect(isProtectedRoute('/onboard/anything')).toBe(false);
    expect(PROTECTED_PREFIXES).not.toContain('/onboard');
  });

  it('still protects every page that holds a user’s own data', () => {
    for (const p of ['/report', '/report/abc-123', '/dashboard', '/account', '/account/settings', '/settings', '/upsell/x', '/api/user/profile']) {
      expect(isProtectedRoute(p), p).toBe(true);
    }
  });

  it('matches on a segment boundary, so API routes are not caught by page prefixes', () => {
    expect(isProtectedRoute('/api/reports/start')).toBe(false);
    expect(isProtectedRoute('/reports')).toBe(false);
    expect(isProtectedRoute('/reportsomething')).toBe(false);
  });
});
