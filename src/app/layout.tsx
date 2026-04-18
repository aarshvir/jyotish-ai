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
// Never allow localhost to leak into production metadata.
const RAW_SITE_URL = process.env.NEXT_PUBLIC_URL ?? '';
const SITE_URL = (RAW_SITE_URL.startsWith('http://localhost') || RAW_SITE_URL === ''
  ? 'https://vedichour.com'
  : RAW_SITE_URL
).trim().replace(/\/+$/, '');
const SITE_NAME = 'VedicHour';
const SITE_TITLE = 'Free Kundli & AI Jyotish Forecast | VedicHour';
// Keep ≤160 chars for Google snippet (no truncation).
const SITE_DESCRIPTION =
  'Free Kundli & AI Jyotish forecast online. 18 hourly Vedic windows/day — Swiss Ephemeris, Lahiri Ayanamsa, Vimshottari Dasha. No card needed.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | VedicHour',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Jyotish',
    'Jyotish AI',
    'Jyotish forecast',
    'Kundli',
    'free Kundli',
    'AI Kundli',
    'Janam Kundali',
    'Vedic astrology',
    'Vedic forecast',
    'astrology report',
    'hourly forecast',
    'choghadiya',
    'hora',
    'Rahu Kaal',
    'nativity report',
    'AI astrology',
    'Swiss Ephemeris',
    'Lahiri Ayanamsa',
    'birth chart',
    'online kundli',
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
        {/* Global JSON-LD: Organization + WebSite + SoftwareApplication */}
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
                  alternateName: ['VedicHour', 'Vedic Hour', 'Jyotish AI'],
                  url: SITE_URL,
                  logo: {
                    '@type': 'ImageObject',
                    url: `${SITE_URL}/icons/icon-512.png`,
                    width: 512,
                    height: 512,
                  },
                  contactPoint: {
                    '@type': 'ContactPoint',
                    email: 'support@vedichour.com',
                    contactType: 'customer support',
                  },
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
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/onboard?q={search_term_string}` },
                    'query-input': 'required name=search_term_string',
                  },
                },
                {
                  '@type': 'SoftwareApplication',
                  '@id': `${SITE_URL}#app`,
                  name: 'VedicHour — AI Jyotish Forecast & Free Kundli',
                  alternateName: [
                    'Free Kundli Generator',
                    'AI Kundli',
                    'Jyotish AI',
                    'Vedic Astrology Report',
                    'Online Kundli',
                    'Janam Kundali Generator',
                  ],
                  description:
                    'Generate your free Kundli (Janam Kundali) and AI-powered Jyotish forecast online. Vedic astrology with 18 hourly precision windows per day — Swiss Ephemeris, Lahiri Ayanamsa, Vimshottari Dasha.',
                  url: SITE_URL,
                  applicationCategory: 'LifestyleApplication',
                  applicationSubCategory: 'Astrology',
                  operatingSystem: 'Web Browser',
                  offers: [
                    {
                      '@type': 'Offer',
                      name: 'Free Kundli (Janam Kundali)',
                      price: '0',
                      priceCurrency: 'USD',
                      description: 'Free Kundli with complete natal birth chart, Lagna, Moon sign, and Dasha period.',
                      url: `${SITE_URL}/onboard?plan=free`,
                    },
                    {
                      '@type': 'Offer',
                      name: '7-Day Jyotish Forecast',
                      price: '9.99',
                      priceCurrency: 'USD',
                      description: '7-day AI Jyotish forecast with 126 hourly windows, choghadiya, hora, and Rahu Kaal.',
                      url: `${SITE_URL}/onboard?plan=7day`,
                    },
                    {
                      '@type': 'Offer',
                      name: 'Monthly Jyotish Oracle',
                      price: '19.99',
                      priceCurrency: 'USD',
                      description: '30-day Vedic astrology forecast with weekly synthesis and monthly Jyotish analysis.',
                      url: `${SITE_URL}/onboard?plan=monthly`,
                    },
                    {
                      '@type': 'Offer',
                      name: 'Annual Jyotish Oracle',
                      price: '49.99',
                      priceCurrency: 'USD',
                      description: 'Full-year Jyotish forecast — 12-month Vedic astrology report with dasha timing.',
                      url: `${SITE_URL}/onboard?plan=annual`,
                    },
                  ],
                  featureList: [
                    'Free Kundli generator',
                    'Janam Kundali online',
                    'AI Jyotish forecast',
                    'Vedic astrology report',
                    'Jyotish hourly forecast',
                    'Swiss Ephemeris calculations',
                    'Lahiri Ayanamsa',
                    'Vimshottari Dasha',
                    'Choghadiya timing',
                    'Hora ruler schedule',
                    'Rahu Kaal warnings',
                    '18 hourly windows per day',
                    'PDF and Markdown export',
                  ],
                  screenshot: `${SITE_URL}/opengraph-image`,
                  publisher: { '@id': `${SITE_URL}#organization` },
                },
              ],
            }),
          }}
        />
      </body>
    </html>
  );
}
