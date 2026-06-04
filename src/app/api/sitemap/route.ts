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

/**
 * Rolling 3-week window: today + next 20 days × 12 signs. Kept short on purpose —
 * the day pages are algorithmically generated, so advertising a full 365-day window
 * (4,380 thin URLs) wastes crawl budget and risks duplicate/thin-content signals.
 * Each page also self-canonicals.
 */
function horoscopeRoutes(): { path: string; changefreq: string; priority: string }[] {
  const out: { path: string; changefreq: string; priority: string }[] = [];
  const today = new Date();
  for (let d = 0; d < 21; d++) {
    const dt = new Date(today);
    dt.setUTCDate(dt.getUTCDate() + d);
    const iso = dt.toISOString().split('T')[0];
    for (const sign of SIGNS) {
      out.push({
        path: `/horoscope/${sign}/${iso}`,
        changefreq: 'daily',
        priority: '0.65',
      });
    }
  }
  return out;
}

const ALL_ROUTES = [...STATIC_ROUTES, ...TRANSIT_ROUTES, ...horoscopeRoutes()];

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
