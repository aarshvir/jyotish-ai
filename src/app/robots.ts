import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_URL ?? 'https://www.vedichour.com')
  .trim()
  .replace(/\/+$/, '');

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
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
