const SITE_URL = 'https://www.vedichour.com';

const PLANETS = [
  'sun', 'moon', 'mars', 'mercury', 'jupiter',
  'venus', 'saturn', 'rahu', 'ketu',
];
const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const STATIC_ROUTES = [
  { path: '/',         changefreq: 'daily',   priority: '1.0'  },
  { path: '/pricing',  changefreq: 'weekly',  priority: '0.95' },
  { path: '/refund',   changefreq: 'monthly', priority: '0.5'  },
  { path: '/privacy',  changefreq: 'monthly', priority: '0.4'  },
  { path: '/terms',    changefreq: 'monthly', priority: '0.4'  },
];

const TRANSIT_ROUTES = PLANETS.flatMap((planet) =>
  SIGNS.map((sign) => ({
    path: `/transit/${planet}/${sign}`,
    changefreq: 'monthly',
    priority: '0.7',
  })),
);

const ALL_ROUTES = [...STATIC_ROUTES, ...TRANSIT_ROUTES];

export function GET() {
  const lastmod = new Date().toISOString();
  const urls = ALL_ROUTES.map(
    (r) =>
      `  <url>\n    <loc>${SITE_URL}${r.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`,
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
