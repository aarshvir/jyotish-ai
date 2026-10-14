import type { Metadata } from 'next';
import { Suspense } from 'react';
import { StartQuiz } from './_Quiz';
import { isCommercialCheckoutEnabled } from '@/lib/commercial/availability';
import { AvailabilityNotice } from '@/components/checkout/AvailabilityNotice';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // The root layout's title template appends "| VedicHour".
  title: 'Find your timing',
  description:
    'Start with free Vedic birth-chart facts, see an example reading or return to an existing report. New paid readings are currently unavailable.',
  alternates: { canonical: '/start' },
};

export default function StartPage() {
  if (!isCommercialCheckoutEnabled()) return <AvailabilityNotice />;
  return (
    <Suspense fallback={null}>
      <StartQuiz />
    </Suspense>
  );
}
