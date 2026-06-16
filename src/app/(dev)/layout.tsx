import type { Metadata } from 'next';

// Developer-only preview routes (e.g. /chart-preview) render mock data and must
// never be indexed. page.tsx files here are client components and can't export
// metadata, so the noindex lives on this server layout. robots.ts also disallows
// the path as a second layer.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return children;
}
