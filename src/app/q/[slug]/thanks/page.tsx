import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Thanks } from './_Thanks';

export const metadata: Metadata = {
  title: 'Thank you',
  robots: { index: false, follow: false },
};

export default function ThanksPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-space" />}>
      <Thanks slugKey={params.slug} />
    </Suspense>
  );
}
