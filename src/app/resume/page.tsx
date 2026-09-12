import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResumeRedirect } from './_Resume';

export const metadata: Metadata = {
  title: 'Opening your reading | VedicHour',
  robots: { index: false, follow: false },
};

export default function ResumePage() {
  return (
    <Suspense fallback={null}>
      <ResumeRedirect />
    </Suspense>
  );
}
