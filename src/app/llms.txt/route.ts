export const dynamic = 'force-dynamic';
export const revalidate = 3600;

import { buildLlmsTxt, SITE_FALLBACK } from '@/lib/seo/aiVisibility';

/**
 * /llms.txt — the plain-text summary AI assistants read first. Generated from the price book and
 * plan list so it can never state a price the checkout does not charge.
 */
export function GET() {
  const raw = (process.env.NEXT_PUBLIC_URL ?? '').trim();
  const site = raw.startsWith('https://') && !/[\r\n]/.test(raw) ? raw.replace(/\/+$/, '') : SITE_FALLBACK;
  return new Response(buildLlmsTxt(site), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
