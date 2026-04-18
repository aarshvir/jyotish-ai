import type { Metadata } from 'next';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import FreeKundli from '@/components/landing/FreeKundli';
import HourlyPreview from '@/components/landing/HourlyPreview';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import { FAQS } from '@/lib/faq-data';
import FinalCTA from '@/components/landing/FinalCTA';

const PAGE_DESCRIPTION =
  'Get your free Kundli (Janam Kundali) and AI Jyotish forecast online. 18 hourly Vedic windows/day — Swiss Ephemeris, Lahiri Ayanamsa. No card needed.';

export const metadata: Metadata = {
  title: { absolute: 'Free Kundli & AI Jyotish Forecast | VedicHour' },
  description: PAGE_DESCRIPTION,
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
    description: PAGE_DESCRIPTION,
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Kundli & AI Jyotish Forecast | VedicHour',
    description: PAGE_DESCRIPTION,
  },
};

function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_URL ?? '';
  return (raw.startsWith('http://localhost') || raw === ''
    ? 'https://www.vedichour.com'
    : raw
  ).trim().replace(/\/+$/, '');
}

export default async function LandingPage() {
  const SITE_URL = getSiteUrl();

  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: 'Free Kundli & AI Jyotish Forecast | VedicHour',
    description: PAGE_DESCRIPTION,
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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <div className="min-h-screen bg-space">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Hero />
      <HowItWorks />
      <FreeKundli />
      <HourlyPreview />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </div>
  );
}
