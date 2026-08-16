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

/** May an internal job token authenticate this path? */
export function isJobTokenAllowedForPath(pathname: string): boolean {
  return matchesPrefix(pathname, JOB_TOKEN_ALLOWED_PREFIXES);
}
