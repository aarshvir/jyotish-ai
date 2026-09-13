import type { Metadata } from 'next';
import { getPlanAmount } from '@/lib/ziina/server';

/** USD monthly subscription price for search/social price tags — from the same table checkout charges from. */
const MONTHLY_USD = (getPlanAmount('sub_monthly', 'USD') / 100).toFixed(2);

export const metadata: Metadata = {
  title: { absolute: 'Pricing — VedicHour' },
  description:
    'Free Vedic calculators with no sign-up. Your hour-by-hour forecast comes with a VedicHour subscription, billed monthly or yearly. Nothing renews automatically. 24-hour refund.',
  keywords: [
    'free Kundli',
    'AI Kundli price',
    'Jyotish forecast price',
    'Vedic astrology report price',
    'online kundli',
    'Janam Kundali online',
  ],
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing — VedicHour',
    description:
      'Free calculators, plus one VedicHour subscription for your hour-by-hour forecast. Monthly or yearly.',
    url: '/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — VedicHour',
    description:
      'Free calculators, plus one VedicHour subscription for your hour-by-hour forecast. Monthly or yearly.',
  },
  other: {
    'og:price:amount': MONTHLY_USD,
    'og:price:currency': 'USD',
    'product:price:amount': MONTHLY_USD,
    'product:price:currency': 'USD',
  },
};

const RAW_SITE_URL = process.env.NEXT_PUBLIC_URL ?? '';
const SITE_URL = (RAW_SITE_URL.startsWith('http://localhost') || RAW_SITE_URL === ''
  ? 'https://www.vedichour.com'
  : RAW_SITE_URL
).trim().replace(/\/+$/, '');

const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/pricing#webpage`,
      url: `${SITE_URL}/pricing`,
      name: 'VedicHour pricing',
      description:
        'Free calculators plus a monthly or yearly subscription for the hour-by-hour forecast.',
      isPartOf: { '@id': `${SITE_URL}#website` },
      breadcrumb: { '@id': `${SITE_URL}/pricing#breadcrumb` },
      inLanguage: 'en',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${SITE_URL}/pricing#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Pricing', item: `${SITE_URL}/pricing` },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'VedicHour plans',
      description: 'Free Vedic calculators and the VedicHour subscription.',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Free Kundli calculator', url: `${SITE_URL}/free-kundli` },
        { '@type': 'ListItem', position: 2, name: 'VedicHour Monthly Subscription', url: `${SITE_URL}/start` },
        { '@type': 'ListItem', position: 3, name: 'VedicHour Yearly Subscription', url: `${SITE_URL}/start` },
      ],
    },
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      {children}
    </>
  );
}
