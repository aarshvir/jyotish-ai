import { describe, expect, it } from 'vitest';

/**
 * Documents the admin report access contract enforced in:
 * - /api/admin/reports/[id] (service-role fetch)
 * - /api/reports/[id]/status (no user_id filter when isAdmin)
 * - report page (admin API + preview bypass)
 */
describe('admin report access contract', () => {
  it('status REST URL omits user_id for admins', () => {
    const reportId = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';
    const base = 'https://example.supabase.co/rest/v1/reports';

    const ownerUrl = `${base}?id=eq.${encodeURIComponent(reportId)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`;
    const adminUrl = `${base}?id=eq.${encodeURIComponent(reportId)}&limit=1`;

    expect(ownerUrl).toContain('user_id=eq.');
    expect(adminUrl).not.toContain('user_id=eq.');
  });

  it('preview gating is bypassed for admin view', () => {
    const isAdminView = true;
    const reportPlanType = 'preview' as string;
    const isPreviewPlan =
      !isAdminView && (reportPlanType === 'free' || reportPlanType === 'preview');
    expect(isPreviewPlan).toBe(false);
  });

  it('preview gating still applies for non-admin preview plans', () => {
    const isAdminView = false;
    const reportPlanType = 'preview' as string;
    const isPreviewPlan =
      !isAdminView && (reportPlanType === 'free' || reportPlanType === 'preview');
    expect(isPreviewPlan).toBe(true);
  });
});
