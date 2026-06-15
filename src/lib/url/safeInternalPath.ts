/**
 * Sanitize a post-auth redirect target to an in-app path, blocking open redirects.
 *
 * Allows only a path that starts with a single "/" followed by a character that is
 * neither "/" nor "\". Rejects protocol-relative ("//evil.com"), backslash tricks
 * ("/\\evil.com"), absolute ("https://evil.com"), bare "/", and empty/non-string
 * input — all fall back to the provided default.
 *
 * Aligns with (and slightly hardens) the guard in src/app/auth/callback/route.ts so
 * client- and server-side redirects share the same allow-rule.
 */
export function safeInternalPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (typeof next !== 'string') return fallback;
  return /^\/[^/\\]/.test(next) ? next : fallback;
}
