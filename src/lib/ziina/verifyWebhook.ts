import { createHmac, timingSafeEqual } from 'node:crypto';

/** Ziina docs: hex-encoded SHA-256 HMAC of the raw JSON body using the webhook secret. */
const HMAC_HEADER_NAMES = ['x-hmac-signature', 'X-Hmac-Signature', 'X-HMAC-Signature'];

export function readZiinaWebhookSignature(headers: Headers): string | null {
  for (const name of HMAC_HEADER_NAMES) {
    const v = headers.get(name);
    if (v?.trim()) return v.trim();
  }
  return null;
}

/**
 * Verifies `X-Hmac-Signature` = HMAC-SHA256(secret, rawBodyUtf8) as lowercase hex.
 * Returns false if secret or signature missing, lengths mismatch, or hex decode fails.
 */
export function verifyZiinaWebhookSignature(
  rawBody: string,
  secret: string,
  receivedHex: string | null,
): boolean {
  if (!secret || !receivedHex) return false;
  const expectedHex = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  try {
    const a = Buffer.from(receivedHex, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Optional allowlist from Ziina docs (set ZIINA_WEBHOOK_ENFORCE_IP=false to skip, e.g. local tunnel). */
const ZIINA_WEBHOOK_IPS = new Set([
  '3.29.184.186',
  '3.29.190.95',
  '20.233.47.127',
  '13.202.161.181',
]);

export function isZiinaWebhookSenderIp(clientIp: string | null): boolean {
  if (!clientIp) return false;
  const first = clientIp.split(',')[0]?.trim() ?? '';
  return ZIINA_WEBHOOK_IPS.has(first);
}

export function shouldEnforceZiinaWebhookIp(): boolean {
  return process.env.ZIINA_WEBHOOK_ENFORCE_IP === 'true';
}
