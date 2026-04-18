import { NextResponse } from 'next/server';

// Never allow localhost to appear in production sitemap URLs.
const RAW_URL = process.env.NEXT_PUBLIC_URL ?? '';
const SITE_URL = (RAW_URL.startsWith('http://localhost') || RAW_URL === ''
  ? 'https://www.vedichour.com'
  : RAW_URL
).trim().replace(/\/+$/, '');

const PLANETS = ['mars', 'jupiter', 'saturn'];
const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

interface SitemapEntry {
  path: string;
  changefreq: string;
  priority: string;
}

const STATIC_ROUTES: SitemapEntry[] = [
  { path: '/',         changefreq: 'daily',   priority: '1.0'  },
  { path: '/pricing',  changefreq: 'weekly',  priority: '0.95' },
  { path: '/refund',   changefreq: 'monthly', priority: '0.5'  },
  { path: '/privacy',  changefreq: 'monthly', priority: '0.4'  },
  { path: '/terms',    changefreq: 'monthly', priority: '0.4'  },
];

const TRANSIT_ROUTES: SitemapEntry[] = PLANETS.flatMap((planet) =>
  SIGNS.map((sign) => ({
    path: `/transit/${planet}/${sign}`,
    changefreq: 'monthly',
    priority: '0.7',
  })),
);

function urlEntry(entry: SitemapEntry, lastmod: string): string {
  return `  <url>
    <loc>${SITE_URL}${entry.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
}

// Revalidate every 24 hours via ISR — sitemap content rarely changes.
export const revalidate = 86400;

export function GET() {
  const lastmod = new Date().toISOString();
  const entries = [...STATIC_ROUTES, ...TRANSIT_ROUTES]
    .map((e) => urlEntry(e, lastmod))
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  });
}
