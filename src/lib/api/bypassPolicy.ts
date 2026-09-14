/**
 * Where the internal auth tokens are allowed to work. Pure policy, no I/O — kept out of
 * `requireAuth.ts` so it is unit-testable without a Supabase/Next request context.
 */

/**
 * Routes the shared, long-lived BYPASS_SECRET may authenticate.
 *
 * The secret is a single static string that lives in e2e scripts, CI env and the owner's
 * shell history, so a leak must not become "act as anyone, anywhere". It exists for two
 * jobs: driving the internal generation pipeline and running the report e2e scripts.
 * Everything else (account deletion/export, payments, PDF export, synastry/kundali
 * compute, user settings) requires a real signed-in session.
 */
export const BYPASS_ALLOWED_PREFIXES = [
  '/api/agents/',
  '/api/commentary/',
  '/api/validation/',
  '/api/reports/',
  '/api/testing/',
  '/api/debug/',
] as const;

/**
 * Routes an internal job token may authenticate. Job tokens are minted only in
 * `reports/start`, `extendMonthly` and the Ziina finalizer, and are only ever sent to the
 * agent / commentary / validation routes — so a captured token cannot be replayed
 * against a user-facing endpoint.
 */
export const JOB_TOKEN_ALLOWED_PREFIXES = [
  '/api/agents/',
  '/api/commentary/',
  '/api/validation/',
] as const;

/**
 * Routes that spend model tokens on the caller's behalf. The pipeline reaches them with a job
 * token; in production a plain customer session may not, or any signed-up user could run paid
 * generation for free. Admin sessions keep access for support and testing.
 */
export const SESSION_RESTRICTED_PREFIXES = ['/api/agents/', '/api/commentary/'] as const;

/** Compute-only routes under a restricted prefix: no model spend, and the calculators call them. */
export const SESSION_RESTRICTED_EXCEPTIONS = ['/api/agents/ephemeris'] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname.startsWith(p));
}

/** May the bypass secret authenticate this path? */
export function isBypassAllowedForPath(
  pathname: string,
  opts: { isProduction: boolean; allowInProduction: boolean },
): boolean {
  // The static secret has no expiry and no per-request scope, so production refuses it
  // unless it is explicitly re-enabled for a production e2e run.
  if (opts.isProduction && !opts.allowInProduction) return false;
  return matchesPrefix(pathname, BYPASS_ALLOWED_PREFIXES);
}

/** May a signed-in user's own session call this path directly? */
export function isSessionAllowedForPath(
  pathname: string,
  opts: { isProduction: boolean; isAdmin: boolean },
): boolean {
  if (!opts.isProduction || opts.isAdmin) return true;
  if (SESSION_RESTRICTED_EXCEPTIONS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return !matchesPrefix(pathname, SESSION_RESTRICTED_PREFIXES);
}

/** May an internal job token authenticate this path? */
export function isJobTokenAllowedForPath(pathname: string): boolean {
  return matchesPrefix(pathname, JOB_TOKEN_ALLOWED_PREFIXES);
}
