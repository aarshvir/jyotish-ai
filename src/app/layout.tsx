import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import MotionProvider from '@/components/shared/MotionProvider';

const cormorant = localFont({
  src: [
    { path: '../../public/fonts/cormorant-garamond-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/cormorant-garamond-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = localFont({
  src: [
    { path: '../../public/fonts/dm-sans-latin-300-normal.woff2', weight: '300', style: 'normal' },
    { path: '../../public/fonts/dm-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/dm-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: '../../public/fonts/jetbrains-mono-latin-400-normal.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-mono',
  display: 'swap',
});

// Some hosting envs can ship NEXT_PUBLIC_URL with trailing whitespace — sanitize.
const SITE_URL = (process.env.NEXT_PUBLIC_URL ?? 'https://www.vedichour.com')
  .trim()
  .replace(/\/+$/, '');
const SITE_NAME = 'VedicHour';
const SITE_TITLE = 'VedicHour — Vedic Astrology, Hour by Hour';
const SITE_DESCRIPTION =
  'AI-powered Vedic astrology forecasts with hourly precision. Know exactly when to act — and when to rest.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s · VedicHour',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Vedic astrology',
    'hourly forecast',
    'choghadiya',
    'hora',
    'Rahu Kaal',
    'nativity report',
    'AI astrology',
    'Swiss Ephemeris',
    'Lahiri Ayanamsa',
  ],
  authors: [{ name: 'VedicHour' }],
  creator: 'VedicHour',
  publisher: 'VedicHour',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#080C18',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-amber focus:text-space focus:font-medium focus:shadow-glow-amber"
        >
          Skip to main content
        </a>
        <MotionProvider>{children}</MotionProvider>
        {/* Organization + WebSite JSON-LD for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': `${SITE_URL}#organization`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  logo: `${SITE_URL}/icons/icon-512.png`,
                  sameAs: [],
                },
                {
                  '@type': 'WebSite',
                  '@id': `${SITE_URL}#website`,
                  url: SITE_URL,
                  name: SITE_NAME,
                  description: SITE_DESCRIPTION,
                  publisher: { '@id': `${SITE_URL}#organization` },
                  inLanguage: 'en',
                },
              ],
            }),
          }}
        />
      </body>
    </html>
  );
}
