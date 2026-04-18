import type { MetadataRoute } from 'next';

const SITE_URL = 'https://vedichour.com';

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
        ],
      },
    ],
    // /sitemap.xml rewrites to /api/sitemap — both URLs return valid XML.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
