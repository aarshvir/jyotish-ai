import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to VedicHour to access your hourly Vedic forecasts, previous reports, and account settings.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Sign In · VedicHour',
    description: 'Sign in to VedicHour to access your reports.',
    url: '/login',
    type: 'website',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
