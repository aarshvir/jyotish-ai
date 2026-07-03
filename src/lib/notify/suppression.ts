import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Email suppression + one-click-unsubscribe tokens.
 *
 * Marketing/nurture sends must honour unsubscribes (deliverability + CAN-SPAM).
 * We sign a per-recipient token so /api/unsubscribe can add them to
 * `email_suppressions` without a login, and every marketing send checks the list
 * first. Transactional mail (report-ready, admin alerts) does NOT suppress.
 */

function secret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'vedichour-unsub-fallback'
  );
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Opaque token = base64url(email) + "." + hmac, so the route can recover + verify the email. */
export function makeUnsubToken(email: string): string {
  const e = email.trim().toLowerCase();
  const mac = createHmac('sha256', secret()).update(e).digest();
  return `${b64url(Buffer.from(e, 'utf8'))}.${b64url(mac)}`;
}

/** Returns the verified email, or null if the token is malformed/forged. */
export function verifyUnsubToken(token: string): string | null {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 2) return null;
  let email: string;
  try {
    email = Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  } catch {
    return null;
  }
  if (!email || !email.includes('@')) return null;
  const expected = createHmac('sha256', secret()).update(email).digest();
  let given: Buffer;
  try {
    given = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  } catch {
    return null;
  }
  if (given.length !== expected.length) return null;
  return timingSafeEqual(given, expected) ? email : null;
}

export function unsubscribeUrl(email: string, site = 'https://www.vedichour.com'): string {
  return `${site}/api/unsubscribe?t=${encodeURIComponent(makeUnsubToken(email))}`;
}

export async function addSuppression(db: SupabaseClient, email: string, reason = 'unsubscribe'): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (!e.includes('@')) return false;
  const { error } = await db
    .from('email_suppressions')
    .upsert({ email: e, reason, created_at: new Date().toISOString() }, { onConflict: 'email' });
  if (error) {
    console.error('[suppression] add failed:', error.message);
    return false;
  }
  return true;
}

/** Lower-cased set of all suppressed emails (small table; one query per cron run). */
export async function fetchSuppressedSet(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db.from('email_suppressions').select('email').limit(100000);
  if (error) {
    // Fail OPEN would spam unsubscribers; fail-safe is to treat the table as empty
    // only when it genuinely doesn't exist yet, else surface nothing (no sends blocked).
    console.error('[suppression] fetch failed:', error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => (r as { email?: string }).email?.trim().toLowerCase()).filter(Boolean) as string[]);
}
