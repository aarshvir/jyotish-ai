import { humanizeAuthError } from '@/lib/auth/humanizeAuthError';

/**
 * "Where should we send your chart?" — the account is created at the moment of delivery, after the
 * visitor has already typed their birth details, instead of as a wall in front of the form.
 *
 * Why an account is needed at all: `reports.user_id` is required and every read path compares
 * ownership, so a report cannot exist without an owner. Anonymous sign-in is disabled on the
 * project, and Supabase `mailer_autoconfirm` is ON, so `signUp` returns a live session at once —
 * no inbox round-trip.
 *
 * THE SECURITY PROPERTY THIS FUNCTION EXISTS TO HOLD: typing an email never signs you into an
 * account you do not already control. A new email creates an account with the password the visitor
 * just chose. An email that is already registered goes through a real `signInWithPassword`, which
 * succeeds only with that account's existing password. There is no path that grants a session from
 * an email alone.
 */

/** The two auth calls this needs — structurally satisfied by `supabase.auth`, easy to fake in tests. */
export interface DeliveryAuthClient {
  signUp(args: {
    email: string;
    password: string;
    options?: { emailRedirectTo?: string };
  }): Promise<{ error: { message: string } | null }>;
  signInWithPassword(args: { email: string; password: string }): Promise<{ error: { message: string } | null }>;
}

export type DeliveryAuthResult =
  | { ok: true; created: boolean }
  | {
      ok: false;
      reason: 'invalid_input' | 'existing_account' | 'confirm_email' | 'error';
      message: string;
    };

export const MIN_PASSWORD_LENGTH = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function createOrSignIn(
  auth: DeliveryAuthClient,
  rawEmail: string,
  password: string,
  emailRedirectTo?: string,
): Promise<DeliveryAuthResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, reason: 'invalid_input', message: 'Enter a valid email address.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      reason: 'invalid_input',
      message: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  const up = await auth.signUp({
    email,
    password,
    ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
  });
  const upMsg = (up.error?.message ?? '').toLowerCase();
  const alreadyRegistered = upMsg.includes('already registered') || upMsg.includes('already been registered');
  if (up.error && !alreadyRegistered) {
    return { ok: false, reason: 'error', message: humanizeAuthError(up.error.message) };
  }

  const signedIn = await auth.signInWithPassword({ email, password });
  if (!signedIn.error) return { ok: true, created: !up.error };

  const inMsg = signedIn.error.message.toLowerCase();
  if (inMsg.includes('email not confirmed') || inMsg.includes('confirm')) {
    return {
      ok: false,
      reason: 'confirm_email',
      message: 'Your account is created — check your inbox for a confirmation link, then come back here.',
    };
  }
  // Invalid credentials straight after a signUp means the email belongs to an EXISTING account: a
  // freshly created one would accept the password it was just given. This also covers projects
  // with email-enumeration protection, where signUp reports success for a taken address.
  if (inMsg.includes('invalid login') || inMsg.includes('invalid credentials')) {
    return {
      ok: false,
      reason: 'existing_account',
      message:
        'You already have a VedicHour account with this email. Enter that password, or use Google if that is how you signed up.',
    };
  }
  return { ok: false, reason: 'error', message: humanizeAuthError(signedIn.error.message) };
}
