import { createHmac, timingSafeEqual } from 'node:crypto';
import { signingSecretOrNull } from '@/lib/notify/suppression';

/**
 * Signed token for the "your chart link" email. It carries a lead id and an expiry and is
 * signed with the same key chain as unsubscribe tokens (a separate prefix keeps the two
 * from being interchangeable). Anyone holding the link can open that one chart; the token
 * reveals nothing else and cannot be forged without the key.
 */

const DEFAULT_TTL_MS = 30 * 24 * 3600_000;

const b64 = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function mac(key: string, payload: string): Buffer {
  return createHmac('sha256', `resume:${key}`).update(payload).digest();
}

export function makeResumeToken(leadId: string, nowMs = Date.now(), ttlMs = DEFAULT_TTL_MS): string | null {
  const key = signingSecretOrNull();
  if (!key) return null;
  const payload = `${leadId}.${Math.floor((nowMs + ttlMs) / 1000)}`;
  return `${b64(Buffer.from(payload, 'utf8'))}.${b64(mac(key, payload))}`;
}

/** The lead id, or null if the token is malformed, forged or expired. */
export function verifyResumeToken(token: string, nowMs = Date.now()): { leadId: string; expiresAt: number } | null {
  const key = signingSecretOrNull();
  if (!key) return null;
  const parts = String(token ?? '').split('.');
  if (parts.length !== 2) return null;
  let payload: string;
  try {
    payload = unb64(parts[0]).toString('utf8');
  } catch {
    return null;
  }
  const expected = mac(key, payload);
  const given = unb64(parts[1]);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const m = /^([0-9a-f-]{36})\.(\d{1,12})$/i.exec(payload);
  if (!m) return null;
  const expiresAt = Number(m[2]) * 1000;
  if (expiresAt < nowMs) return null;
  return { leadId: m[1], expiresAt };
}
