import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import FirstTouch from '@/components/analytics/FirstTouch';
import RefCapture from '@/components/analytics/RefCapture';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { MetaPixel } from '@/components/analytics/MetaPixel';
import { vedicHourOffers } from '@/lib/seo/aiVisibility';

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
  ? 'https://www.vedichour.com'
  : RAW_SITE_URL
).trim().replace(/\/+$/, '');
const SITE_NAME = 'VedicHour';
const SITE_TITLE = 'VedicHour | Free Vedic Birth Chart';
// Keep ≤160 chars for Google snippet (no truncation).
const SITE_DESCRIPTION =
  'Calculate your free Vedic birth-chart facts, explore a traditional compatibility score and read an example. No sign-up or card required.';

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
  // No site-wide `alternates` on purpose. A canonical set here is inherited by any page that
  // forgets its own, which would silently point that page at the homepage. Every indexable
  // page sets its own canonical. hreflang is added only when a real translated page exists.
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
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
  verification: {
    google: 'bGPkSiG0SdtqqPHXPh0JeB44AnlvZxek7wkPRD8Ul2o',
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
  themeColor: '#171c1b',
  colorScheme: 'dark light',
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
        <PostHogProvider>{children}</PostHogProvider>
        <FirstTouch />
        <RefCapture />
        <FeedbackWidget />
        <GoogleAnalytics />
        <MetaPixel />
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
                {
                  '@type': 'SoftwareApplication',
                  '@id': `${SITE_URL}#app`,
                  name: 'VedicHour — hour-by-hour Vedic timing',
                  alternateName: [
                    'Free Kundli Generator',
                    'AI Kundli',
                    'Jyotish AI',
                    'Vedic Astrology Report',
                    'Online Kundli',
                    'Janam Kundali Generator',
                  ],
                  description:
                    'Calculate free Vedic birth-chart facts and a traditional compatibility score. Explore a clearly labelled example interpretation and access existing account reports.',
                  url: SITE_URL,
                  applicationCategory: 'LifestyleApplication',
                  applicationSubCategory: 'Astrology',
                  operatingSystem: 'Web Browser',
                  // Built from the price book + plan list, so structured data can never quote a price
                  // the checkout does not charge (it used to say $9.99 / $19.99 / $49.99 one-time).
                  offers: vedicHourOffers(SITE_URL),
                  featureList: [
                    'Free Kundli generator',
                    'Free traditional compatibility score',
                    'Swiss Ephemeris calculations',
                    'Lahiri Ayanamsa',
                    'Vimshottari Dasha',
                    'Example reading with calculation and interpretation labelled',
                    'Existing account report access',
                  ],
                  // NOTE: aggregateRating intentionally omitted. Google disallows
                  // self-asserted ratings without a genuine, visible on-page review
                  // mechanism — re-add only when wired to a real review source.
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
