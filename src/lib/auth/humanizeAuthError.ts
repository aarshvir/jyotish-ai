/**
 * Turn a raw Supabase auth error into a sentence a person can act on.
 *
 * Shared by the sign-in page and the onboarding delivery gate so the same failure never reads two
 * different ways depending on where the visitor happened to meet it.
 */
export function humanizeAuthError(raw: string | null | undefined): string {
  if (!raw) return '';
  const msg = raw.toLowerCase();
  if (msg === 'auth' || msg.includes('error=auth')) {
    return 'Sign-in did not complete. Please try again.';
  }
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return 'That email and password don’t match. Try again or reset your password.';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email first — check your inbox for a verification link.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Network hiccup — check your connection and try again.';
  }
  if (msg.includes('password')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('oauth') || msg.includes('provider')) {
    return 'Google sign-in failed. Please try again or use email.';
  }
  return raw;
}
