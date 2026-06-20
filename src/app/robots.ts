import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.vedichour.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/sitemap'],
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
    // Point crawlers at the canonical /sitemap.xml (Next.js' default sitemap
    // location). next.config.mjs rewrites /sitemap.xml → /api/sitemap, and
    // /sitemap.xml sits OUTSIDE the Disallow: /api/ rule — so stricter crawlers
    // (Seobility/Siteliner) see no "sitemap inside a disallowed path" warning.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
