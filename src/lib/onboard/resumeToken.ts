import { createHmac, timingSafeEqual } from 'node:crypto';
import { signingSecretOrNull } from '@/lib/notify/suppression';

/**
 * Signed "pick up where you left off" links for the win-back email.
 *
 * The person already gave us their birth details once. Making them retype
 * everything on a phone after tapping an email is the single biggest friction
 * left between that email and a payment, so the link carries a token that
 * resolves to their own earlier report and pre-fills the form.
 *
 * The token is the capability, so it is:
 *   - bound to one report id,
 *   - HMAC-signed with the same key chain as unsubscribe links,
 *   - domain-separated ("resume:") so an unsubscribe token can never be replayed
 *     as a resume token or the reverse,
 *   - expiring after 45 days.
 */

const TTL_SECONDS = 45 * 24 * 3600;
/** Tolerate small clock skew between the minting and verifying servers. */
const MAX_FUTURE_SKEW_SECONDS = 300;

const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function mac(secret: string, payload: string): Buffer {
  return createHmac('sha256', secret).update(`resume:${payload}`).digest();
}

export function makeResumeToken(reportId: string, nowSec: number = Math.floor(Date.now() / 1000)): string {
  const secret = signingSecretOrNull();
  if (!secret) throw new Error('A signing secret is required to mint resume links.');
  const payload = `${reportId}.${nowSec}`;
  return `${b64url(Buffer.from(payload, 'utf8'))}.${b64url(mac(secret, payload))}`;
}

/** Returns the report id, or null if the token is malformed, forged, or expired. */
export function verifyResumeToken(token: string, nowSec: number = Math.floor(Date.now() / 1000)): string | null {
  const secret = signingSecretOrNull();
  if (!secret) return null; // fail closed

  const parts = String(token ?? '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  let payload: string;
  try {
    payload = fromB64url(parts[0]).toString('utf8');
  } catch {
    return null;
  }
  const m = payload.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(\d{9,11})$/i);
  if (!m) return null;

  const issued = Number(m[2]);
  if (issued > nowSec + MAX_FUTURE_SKEW_SECONDS) return null;
  if (nowSec - issued > TTL_SECONDS) return null;

  let given: Buffer;
  try {
    given = fromB64url(parts[1]);
  } catch {
    return null;
  }
  const expected = mac(secret, payload);
  if (given.length !== expected.length) return null;
  return timingSafeEqual(given, expected) ? m[1] : null;
}
