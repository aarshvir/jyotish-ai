/**
 * Canonical plan_type handling for entitlement / preview stripping.
 *
 * Clients (and hand-rolled API calls) can send whitespace or mixed-case values
 * like `" free "` / `"Preview"`. Free entitlement checks historically trimmed,
 * but persistence + preview stripping did not — so a padded free plan could
 * generate and render full paid report_data. Always normalize before store,
 * pipeline input, or paywall gates.
 */

export function normalizePlanType(
  raw: string | null | undefined,
  fallback = '7day',
): string {
  const normalized = String(raw ?? '').trim().toLowerCase();
  return normalized || fallback;
}

/** Free preview tier — natal + one sample day; paid sections must be stripped. */
export function isFreeOrPreviewPlan(raw: string | null | undefined): boolean {
  const plan = normalizePlanType(raw, '');
  return plan === 'free' || plan === 'preview';
}
