/**
 * What counts as internal / test traffic for /admin2 ratios. Internal rows are
 * still stored and can be shown with the "include internal" toggle; they are just
 * kept out of conversion maths so the owner's own testing (82% of all rows as of
 * 2026-09) cannot pass for customers.
 */

const INTERNAL_EMAIL_RULES: { label: string; test: (e: string) => boolean }[] = [
  { label: 'ends with @vedichour.com', test: (e) => e.endsWith('@vedichour.com') },
  { label: 'ends with @example.com', test: (e) => e.endsWith('@example.com') },
  { label: 'contains "aarshvir"', test: (e) => e.includes('aarshvir') },
  { label: 'contains "e2e"', test: (e) => e.includes('e2e') },
];

export const INTERNAL_RULE_LABELS = [
  ...INTERNAL_EMAIL_RULES.map((r) => `email ${r.label}`),
  'any address in the admin list',
  'events sent from a host other than vedichour.com (local dev, preview deploys)',
  'any visitor who was ever signed in as one of the above',
];

export function isInternalEmail(email: string | null | undefined, adminEmails: Set<string> = new Set()): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return adminEmails.has(e) || INTERNAL_EMAIL_RULES.some((r) => r.test(e));
}

/** Host recorded by /api/events. Unknown (older rows) is treated as production. */
export function isInternalHost(host: unknown): boolean {
  if (typeof host !== 'string' || !host) return false;
  const h = host.toLowerCase().split(':')[0];
  return !(h === 'vedichour.com' || h.endsWith('.vedichour.com'));
}
