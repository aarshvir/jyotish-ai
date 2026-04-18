/**
 * Server-only bypass / admin helpers.
 * Promo codes are stored in the `promo_codes` Supabase table — never hardcoded here.
 */

export const BYPASS_SECRET = process.env.BYPASS_SECRET ?? '';

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isBypassToken(value: unknown): boolean {
  if (typeof value !== 'string' || !value) return false;
  const secret = BYPASS_SECRET;
  return secret.length > 0 && value === secret;
}

export function isBypassUrl(searchParams: URLSearchParams): boolean {
  return isBypassToken(searchParams.get('bypass'));
}

export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
