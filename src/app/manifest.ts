import type { MetadataRoute } from 'next';

const theme = '#080C18';

function appOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_URL ?? '').trim();
  const safe = (raw.startsWith('http://localhost') || raw === '')
    ? 'https://www.vedichour.com'
    : raw;
  try { return new URL(safe).origin; } catch { return 'https://www.vedichour.com'; }
}

export default function manifest(): MetadataRoute.Manifest {
  const origin = appOrigin();
  return {
    id: `${origin}/`,
    name: 'VedicHour — Vedic Astrology, Hour by Hour',
    short_name: 'VedicHour',
    description:
      'Hour-by-hour Vedic timing from your birth chart. Eighteen scored windows a day, in plain English.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: theme,
    theme_color: theme,
    categories: ['lifestyle', 'health'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
