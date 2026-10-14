/**
 * Turn a raw Supabase auth error into a sentence a person can act on.
 *
 * Shared by the sign-in page and the onboarding delivery gate so the same failure never reads two
 * different ways depending on where the visitor happened to meet it.
 */
export function humanizeAuthError(raw: string | null | undefined): string {
  if (!raw) return '';
  const msg = raw.trim().toLowerCase();
  if (!msg) return '';
  if (msg === 'auth' || msg.includes('error=auth')) {
    return 'Sign-in did not complete. Please try again.';
  }
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return 'That email and password do not match. Check them or use Forgot password on the sign-in page.';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Confirm your email before signing in. Check your inbox and spam folder for the confirmation link.';
  }
  if (msg.includes('expired') || msg.includes('otp_expired') || msg.includes('invalid token') || msg.includes('invalid grant')) {
    return 'This sign-in or recovery link is no longer valid. Use the latest email link, or return to sign-in to request a new password reset.';
  }
  if (msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('too many') || msg.includes('over_email_send')) {
    return 'Too many attempts. Wait before trying again; requesting repeatedly can delay recovery.';
  }
  if (msg.includes('session') || msg.includes('refresh token') || msg.includes('not authenticated')) {
    return 'Your session ended. Sign in again with the same account to retrieve your existing reports.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Could not connect. Check your internet connection and try again. Your existing reports were not changed.';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Sign-in took too long. Check your connection and try again.';
  }
  if (msg.includes('same password') || msg.includes('different from the old') || msg.includes('same_password')) {
    return 'Choose a new password that is different from your current password.';
  }
  if (msg.includes('weak_password') || msg.includes('weak password') || msg.includes('password should') || msg.includes('password must') || msg.includes('password is too short')) {
    return 'Choose a stronger password with at least 6 characters, following any requirements shown on the form.';
  }
  if (msg.includes('email') && (msg.includes('invalid') || msg.includes('valid address'))) {
    return 'Enter a valid email address and try again.';
  }
  if (msg.includes('email_address_not_authorized') || msg.includes('signup is disabled') || msg.includes('signups not allowed')) {
    return 'Account creation is currently unavailable. You can still use the free calculator or sign in to an existing account.';
  }
  if (msg.includes('oauth') || msg.includes('provider')) {
    return 'Google sign-in did not complete. Try again with the same Google account, or use email if that is your original sign-in method.';
  }
  return 'Sign-in could not be completed. Please try again. If it continues, open sign-in help or contact support without sharing your password.';
}
