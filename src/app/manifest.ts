import type { MetadataRoute } from 'next';

const theme = '#080C18';

function appOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_URL ?? 'https://www.vedichour.com').trim();
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://www.vedichour.com';
  }
}

export default function manifest(): MetadataRoute.Manifest {
  const origin = appOrigin();
  return {
    id: `${origin}/`,
    name: 'VedicHour — Vedic Astrology, Hour by Hour',
    short_name: 'VedicHour',
    description:
      'AI-powered Vedic astrology forecasts with hourly precision. Know exactly when to act — and when to rest.',
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
