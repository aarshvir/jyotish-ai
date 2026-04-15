/** Server-only env for URL/API bypass token (never NEXT_PUBLIC_). */
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

/** For use on the server with `URLSearchParams` (e.g. request.nextUrl.searchParams). */
export function isBypassUrl(searchParams: URLSearchParams): boolean {
  return isBypassToken(searchParams.get('bypass'));
}

export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export const PROMO_CODES: Record<string, number> = {
  // ── Advertised (new launch offer) ──────────────────────────────────────────
  NEWUSER30: 30,
  // ── Private (never advertised) ─────────────────────────────────────────────
  ADMIN100: 100,
  FRIENDTESTING: 80,
  // ── Legacy ─────────────────────────────────────────────────────────────────
  LAUNCH50: 50,
  FREEREPORT: 100,
  VEDICHOUR: 20,
  EARLYBIRD: 30,
};

export function getPromoDiscount(code: string): number {
  if (!code) return 0;
  return PROMO_CODES[code.trim().toUpperCase()] ?? 0;
}

/** Codes that should never appear in public UI / banners */
export const PRIVATE_PROMO_CODES = new Set(['ADMIN100', 'FRIENDTESTING']);
