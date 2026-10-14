export const dynamic = 'force-dynamic';
export const revalidate = 3600;

import { buildLlmsFullTxt, SITE_FALLBACK } from '@/lib/seo/aiVisibility';

/** /llms-full.txt — definitions, methodology, FAQ and every guide, for assistants that want depth. */
export function GET() {
  const raw = (process.env.NEXT_PUBLIC_URL ?? '').trim();
  const site = raw.startsWith('https://') && !/[\r\n]/.test(raw) ? raw.replace(/\/+$/, '') : SITE_FALLBACK;
  return new Response(buildLlmsFullTxt(site), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
