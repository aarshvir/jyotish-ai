import { cleanEnv } from '@/lib/env';

/**
 * Tracking IDs are pasted into inline <script> string literals, so they must be validated — not
 * merely read — before they reach the page.
 *
 * On 2026-09-12 the production NEXT_PUBLIC_META_PIXEL_ID ended in a line break. That put a newline
 * inside `fbq('init', '…')`, a syntax error that stopped the whole init script: the pixel never
 * initialised, so no PageView or conversion had ever reached Meta. Validating the format also means
 * a bad env value renders nothing rather than throwing, and can never inject script.
 */

/** Meta Pixel IDs are purely numeric. */
export function metaPixelId(raw: string | undefined): string | null {
  const id = cleanEnv(raw);
  return /^\d{10,20}$/.test(id) ? id : null;
}

/** GA4 measurement IDs look like G-XXXXXXXXXX. */
export function ga4Id(raw: string | undefined): string | null {
  const id = cleanEnv(raw).toUpperCase();
  return /^G-[A-Z0-9]{4,16}$/.test(id) ? id : null;
}
