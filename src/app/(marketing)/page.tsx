import type { Metadata } from 'next';
import Hero from '@/components/landing/Hero';
import Products from '@/components/landing/Products';
import HowItWorks from '@/components/landing/HowItWorks';
import FreeKundli from '@/components/landing/FreeKundli';
import SampleReportPreview from '@/components/landing/SampleReportPreview';
import UseCases from '@/components/landing/UseCases';
import VedicVsWestern from '@/components/landing/VedicVsWestern';
import Pricing from '@/components/landing/Pricing';
import PricingComparison from '@/components/landing/PricingComparison';
import Testimonials from '@/components/landing/Testimonials';
import HindiWaitlist from '@/components/landing/HindiWaitlist';
import FAQ from '@/components/landing/FAQ';
import { FAQS } from '@/lib/faq-data';
import FinalCTA from '@/components/landing/FinalCTA';

const PAGE_DESCRIPTION =
  'Your chart scored into 18 hourly windows a day — clearer vs heavier, in plain English. Free birth chart to start. No card needed.';

export const metadata: Metadata = {
  title: { absolute: 'Hour-by-hour Vedic timing | VedicHour' },
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
    title: 'Hour-by-hour Vedic timing | VedicHour',
    description: PAGE_DESCRIPTION,
    url: '/',
    type: 'website',
    // Re-declared here because a page-level openGraph REPLACES (not merges
    // with) the root layout's openGraph, which would otherwise drop the image.
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'VedicHour — your day is not one mood' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hour-by-hour Vedic timing | VedicHour',
    description: PAGE_DESCRIPTION,
    images: ['/opengraph-image'],
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
    name: 'Hour-by-hour Vedic timing | VedicHour',
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
      <Products />
      <HowItWorks />
      <FreeKundli />
      <UseCases />
      <SampleReportPreview />
      <VedicVsWestern />
      <Pricing />
      <PricingComparison />
      <Testimonials />
      <HindiWaitlist />
      <FAQ />
      <FinalCTA />
    </div>
  );
}
