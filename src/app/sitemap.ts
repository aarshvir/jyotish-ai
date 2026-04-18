import type { MetadataRoute } from 'next';

// Env vars on some hosts can ship with trailing whitespace/slash; sanitize.
// Always use the production domain for sitemap URLs — never localhost.
const RAW_URL = process.env.NEXT_PUBLIC_URL ?? '';
const SITE_URL = (RAW_URL.startsWith('http://localhost') || RAW_URL === ''
  ? 'https://www.vedichour.com'
  : RAW_URL
).trim().replace(/\/+$/, '');

// Force static generation — sitemap must never be dynamically rendered.
export const dynamic = 'force-static';

const PLANETS = ['mars', 'jupiter', 'saturn'];
const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: Array<{
    path: string;
    changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority: number;
  }> = [
    // Landing page: primary keyword target (free kundli, AI jyotish, vedic forecast)
    { path: '/', changeFrequency: 'daily', priority: 1.0 },
    // Pricing: secondary commercial intent target
    { path: '/pricing', changeFrequency: 'weekly', priority: 0.95 },
    // Legal — lower crawl priority
    { path: '/privacy', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/terms', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/refund', changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Transit SEO pages — long-tail keyword targets
  const transitRoutes = PLANETS.flatMap((planet) =>
    SIGNS.map((sign) => ({
      path: `/transit/${planet}/${sign}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  );

  return [...staticRoutes, ...transitRoutes].map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
