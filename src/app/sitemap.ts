import type { MetadataRoute } from 'next';

// Env vars on some hosts can ship with trailing whitespace/slash; sanitize.
const SITE_URL = (process.env.NEXT_PUBLIC_URL ?? 'https://www.vedichour.com')
  .trim()
  .replace(/\/+$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{
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

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
