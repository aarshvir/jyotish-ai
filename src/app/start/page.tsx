import type { Metadata } from 'next';
import { Suspense } from 'react';
import { StartQuiz } from './_Quiz';

export const metadata: Metadata = {
  // The root layout's title template appends "| VedicHour".
  title: 'Find your timing',
  description:
    'A short quiz about what is on your mind, then your birth chart worked out and your next 30 days planned hour by hour.',
  alternates: { canonical: '/start' },
};

export default function StartPage() {
  return (
    <Suspense fallback={null}>
      <StartQuiz />
    </Suspense>
  );
}
