import { headers } from 'next/headers';
import type { Metadata } from 'next';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import FreeKundli from '@/components/landing/FreeKundli';
import HourlyPreview from '@/components/landing/HourlyPreview';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import { currencyFromHeader, getPricesForCurrency } from '@/lib/pricing';

export const metadata: Metadata = {
  title: { absolute: 'Free Kundli & AI Jyotish Forecast | VedicHour' },
  description:
    'Generate your free Kundli (Janam Kundali) and AI-powered Jyotish forecast online. 18 hourly Vedic astrology windows per day — Swiss Ephemeris, Lahiri Ayanamsa. Free preview, no card needed.',
  keywords: [
    'Jyotish',
    'Jyotish AI',
    'Jyotish forecast',
    'free Kundli',
    'Kundli',
    'AI Kundli',
    'Janam Kundali',
    'online kundli',
    'Vedic forecast',
    'Vedic astrology',
    'astrology report',
    'birth chart',
    'hora forecast',
    'choghadiya',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Free Kundli & AI Jyotish Forecast | VedicHour',
    description:
      'Generate your free Kundli and AI Jyotish forecast online. Vedic astrology with 18 hourly windows per day. Free preview, no card needed.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Kundli & AI Jyotish Forecast | VedicHour',
    description:
      'Generate your free Kundli and AI Jyotish forecast online. Vedic astrology with 18 hourly windows per day. Free preview, no card needed.',
  },
};

const SITE_URL = (process.env.NEXT_PUBLIC_URL ?? 'https://www.vedichour.com').trim().replace(/\/+$/, '');

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/#webpage`,
  url: SITE_URL,
  name: 'Free Kundli & AI Jyotish Forecast | VedicHour',
  description:
    'Generate your free Kundli (Janam Kundali) and AI-powered Jyotish forecast online. 18 hourly Vedic windows per day — Swiss Ephemeris, Lahiri Ayanamsa.',
  isPartOf: { '@id': `${SITE_URL}#website` },
  about: {
    '@type': 'Thing',
    name: 'Jyotish Astrology',
    alternateName: ['Vedic astrology', 'Hindu astrology', 'Kundli', 'Janam Kundali'],
    description:
      'Jyotish is the classical Indian system of Vedic astrology using sidereal planetary positions, the Lahiri Ayanamsa, Vimshottari Dasha, and hora-based timing to forecast life events.',
  },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['#free-kundli', '#faq', 'h1', 'h2'],
  },
  inLanguage: 'en',
};

export default async function LandingPage() {
  const h = await headers();
  const currency = currencyFromHeader(h.get('x-currency'));
  const prices = getPricesForCurrency(currency);

  return (
    <div className="min-h-screen bg-space">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />
      <Hero />
      <HowItWorks />
      <FreeKundli />
      <HourlyPreview />
      <Pricing currency={currency} prices={prices} />
      <FAQ />
      <FinalCTA />
    </div>
  );
}
