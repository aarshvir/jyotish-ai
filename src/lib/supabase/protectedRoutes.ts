/**
 * Routes that require an authenticated Supabase session.
 *
 * Deliberately NOT in this list: `/onboard`.
 *
 * `/onboard` was protected from 2026-03-28 (commit 16d1a41) until the
 * "quiz first, account at delivery" change. Protecting it bounced every
 * logged-out visitor to `/login` ("Create your free account to generate your
 * Kundli") while `/free-kundli`, `/lagna-calculator`, `/manglik-dosha-calculator`
 * and `/kaal-sarp-dosha-calculator` — the pages that actually rank — promised
 * "instant, free, no signup". 1,975 sessions reached /lagna-calculator; 333
 * reached onboard step 0. The wall was the drop.
 *
 * The account is still created — it has to be, because `reports.user_id` is
 * NOT NULL and every read path compares ownership — but it is created at the
 * moment of delivery (`/api/auth/claim-free`), framed as "where should we send
 * your chart", after the visitor has already done the work. See
 * `docs/RELAUNCH_SPEC.md` § "S16 — EMAIL + WHATSAPP GATE".
 */
export const PROTECTED_PREFIXES = [
  '/dashboard',
  '/auth/consent',
  '/settings',
  '/account',
  '/api/user',
  '/report',
  '/upsell',
] as const;

/**
 * Exact path match OR prefix followed by a '/' segment boundary — so '/report'
 * does not match the '/api/reports/start' API route.
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}
