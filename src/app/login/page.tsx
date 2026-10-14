import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { AccountSignIn } from '@/components/help/AccountSignIn';

export const metadata: Metadata = {
  title: 'Sign in to your account',
  description: 'Sign in with your original email or Google account to retrieve existing reports and manage saved preferences.',
  robots: { index: false, follow: true },
};

// The pre-hydration shell has no submitting form or credential inputs.
function LoginShell() {
  return <main id="main-content" className="flex min-h-screen items-center justify-center bg-space px-5 py-10 font-body text-star">
    <div className="w-full max-w-md">
      <Link href="/" className="font-display text-3xl font-semibold text-star">VedicHour</Link>
      <h1 className="mt-6 text-2xl font-semibold">Sign in to your account</h1>
      <p className="mt-2 text-sm leading-relaxed text-dust">Use the same email or Google account to find your existing reports.</p>
      <p role="status" className="mt-6 text-sm text-dust">Loading secure sign-in...</p>
      <noscript><p className="mt-4 text-sm text-dust">JavaScript is needed for secure sign-in. Enable it and reload this page.</p></noscript>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-horizon pt-4 text-sm">
        <Link href="/help/sign-in" className="py-2 text-amber">Sign-in help</Link>
        <Link href="/free-kundli" className="py-2 text-amber">Free chart without sign-in</Link>
        <Link href="/sample-report" className="py-2 text-amber">Example reading</Link>
      </div>
    </div>
  </main>;
}

export default function LoginPage() {
  return <Suspense fallback={<LoginShell />}><AccountSignIn /></Suspense>;
}
