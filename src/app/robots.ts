import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.vedichour.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard',
          '/report/',
          '/onboarding',
          '/onboard',
          '/login',
          '/signup',
          '/upsell',
          '/kundali/',   // private report pages /kundali/{id} (NOT the /kundali landing page)
          '/synastry/',  // private report pages /synastry/{id} (NOT the /synastry landing page)
          '/chart-preview', // dev-only mock-data preview
        ],
      },
    ],
    // The rewrite /sitemap.xml → /api/sitemap is in next.config.mjs.
    // robots.txt also points directly to the API route so crawlers can
    // always reach the sitemap (per Google spec, Sitemap directives are
    // exempt from Disallow rules, so /api/ blocking doesn't affect this).
    sitemap: `${SITE_URL}/api/sitemap`,
    host: SITE_URL,
  };
}
