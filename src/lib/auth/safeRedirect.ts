export function safeInternalRedirectPath(
  rawPath: string | null | undefined,
  fallback = '/dashboard',
): string {
  return typeof rawPath === 'string' && /^\/[^/]/.test(rawPath) ? rawPath : fallback;
}
