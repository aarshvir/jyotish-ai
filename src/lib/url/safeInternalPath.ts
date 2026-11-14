/**
 * Sanitize a post-auth redirect target to an in-app path, blocking open redirects.
 *
 * The client router resolves `next` with `new URL(path, location.href)` and, when
 * that origin differs, assigns `window.location` to it. The WHATWG parser deletes
 * TAB, LF, and CR, so a value like "/\t/evil.example" becomes the protocol-relative
 * URL "//evil.example". A prefix check that only rejects "/" and "\" lets that through.
 *
 * Reject protocol-relative URLs, backslashes, C0 controls, and any value that
 * resolves to a different origin. Bare "/", empty, and non-string input use the fallback.
 */
const CONTROL_OR_BACKSLASH = /[\u0000-\u001F\u007F\\]/;
const BASE = 'https://vedichour.invalid';

export function safeInternalPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (typeof next !== 'string' || next === '/' || !next.startsWith('/') || next.startsWith('//')) {
    return fallback;
  }
  if (CONTROL_OR_BACKSLASH.test(next)) return fallback;
  try {
    const resolved = new URL(next, BASE);
    if (resolved.origin !== BASE || resolved.username || resolved.password) return fallback;
  } catch {
    return fallback;
  }
  return next;
}
