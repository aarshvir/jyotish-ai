import type { MetadataRoute } from 'next';
import { AI_CRAWLERS, PRIVATE_PATHS } from '@/lib/seo/aiVisibility';

const SITE_URL = 'https://www.vedichour.com';

export default function robots(): MetadataRoute.Robots {
  const allow = ['/', '/api/sitemap'];
  const disallow = [...PRIVATE_PATHS];
  return {
    rules: [
      { userAgent: '*', allow, disallow },
      // AI search and assistant crawlers are named on purpose: being quoted in ChatGPT, Claude,
      // Gemini and Perplexity answers is a growth channel. Same private-path rules as everyone.
      { userAgent: [...AI_CRAWLERS], allow, disallow },
    ],
    // Point crawlers at the canonical /sitemap.xml (Next.js' default sitemap
    // location). next.config.mjs rewrites /sitemap.xml → /api/sitemap, and
    // /sitemap.xml sits OUTSIDE the Disallow: /api/ rule — so stricter crawlers
    // (Seobility/Siteliner) see no "sitemap inside a disallowed path" warning.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
