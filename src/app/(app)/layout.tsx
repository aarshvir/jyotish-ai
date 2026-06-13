import type { Metadata } from 'next';
import Navbar from '@/components/shared/Navbar';
import MotionProvider from '@/components/shared/MotionProvider';

// Private/transactional surface — keep the whole (app) group out of Google's index.
// Children (dashboard, report/[id], upsell, upsell/success) are 'use client' and
// cannot self-export metadata, so this server layout is the authoritative noindex.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionProvider>
      <Navbar />
      <main id="main-content" className="min-h-screen">{children}</main>
    </MotionProvider>
  );
}
