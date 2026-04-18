/**
 * Ziina webhook HMAC verification.
 *
 * Ziina signs webhook requests with HMAC-SHA256(secret, rawBody) and sends the
 * hex digest in a header. The exact header name varies by Ziina version; we
 * support multiple fallbacks and allow override via ZIINA_WEBHOOK_SIGNATURE_HEADER.
 *
 * If ZIINA_WEBHOOK_SECRET is not set, verification is skipped (dev mode) and a
 * warning is logged — the webhook still runs but is insecure. Never ship
 * production without the secret configured.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_HEADERS = [
  'ziina-signature',
  'x-ziina-signature',
  'ziina-webhook-signature',
];

export interface VerifyResult {
  ok: boolean;
  /** True when verification was skipped (no secret configured). Dev only. */
  skipped: boolean;
  reason?: string;
}

/**
 * Verify the signature on a raw Ziina webhook body.
 * Returns ok=true if signature matches OR if no secret is configured (dev).
 */
export function verifyZiinaWebhook(
  rawBody: string,
  headers: Headers,
): VerifyResult {
  const secret = (process.env.ZIINA_WEBHOOK_SECRET ?? '').trim();

  if (!secret) {
    // No secret configured — skip verification but log loudly.
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[ziina/webhook] SECURITY: ZIINA_WEBHOOK_SECRET is not set in production. ' +
          'Webhook is running unauthenticated. Configure the secret in Vercel env vars immediately.',
      );
    }
    return { ok: true, skipped: true, reason: 'no_secret_configured' };
  }

  // Prefer the explicitly configured header; fall back to common defaults.
  const preferredHeader = (
    process.env.ZIINA_WEBHOOK_SIGNATURE_HEADER ?? ''
  )
    .trim()
    .toLowerCase();
  const candidates = preferredHeader
    ? [preferredHeader, ...DEFAULT_HEADERS]
    : DEFAULT_HEADERS;

  let signature = '';
  for (const name of candidates) {
    const v = headers.get(name);
    if (v && v.length > 0) {
      signature = v.trim();
      break;
    }
  }

  if (!signature) {
    return {
      ok: false,
      skipped: false,
      reason: `missing_signature_header (tried: ${candidates.join(', ')})`,
    };
  }

  // Some providers prefix the signature with "sha256=" — strip if present.
  const normalised = signature.startsWith('sha256=')
    ? signature.slice('sha256='.length)
    : signature;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  // timingSafeEqual requires equal-length buffers.
  const a = Buffer.from(normalised, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length === 0 || a.length !== b.length) {
    return { ok: false, skipped: false, reason: 'signature_length_mismatch' };
  }

  const match = timingSafeEqual(a, b);
  return match
    ? { ok: true, skipped: false }
    : { ok: false, skipped: false, reason: 'signature_mismatch' };
}
