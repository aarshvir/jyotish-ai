import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple one-time pricing for VedicHour. Free preview, 7-day, monthly, and annual Vedic hourly forecasts. No subscriptions. 48-hour refund.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing · VedicHour',
    description:
      'One-time pricing for hour-by-hour Vedic forecasts. 7-day, monthly, and annual Oracle plans.',
    url: '/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing · VedicHour',
    description:
      'One-time pricing for hour-by-hour Vedic forecasts. 7-day, monthly, and annual Oracle plans.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
