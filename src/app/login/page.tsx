import { Suspense } from 'react';
import Link from 'next/link';
import LoginForm from './_LoginForm';

/** Static form shell rendered during SSR / by crawlers. */
function LoginShell() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-space via-dark to-space flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-white/[0.03] border border-amber/15 rounded-2xl p-8 sm:p-10">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block font-display font-semibold text-2xl tracking-[0.08em] text-amber rounded-sm"
          >
            VedicHour
          </Link>
          <p className="font-body text-sm text-dust mt-2">Sign in to your account</p>
        </div>

        <form method="POST" action="/api/auth/signin" noValidate>
          <div className="mb-4">
            <label htmlFor="shell-email" className="block font-body text-xs font-medium text-dust mb-1.5">
              Email
            </label>
            <input
              id="shell-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3 min-h-[48px] bg-white/[0.05] border border-white/10 rounded-lg font-body text-sm text-star placeholder:text-dust/40"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="shell-password" className="block font-body text-xs font-medium text-dust mb-1.5">
              Password
            </label>
            <input
              id="shell-password"
              type="password"
              name="password"
              placeholder="Your password"
              autoComplete="current-password"
              className="w-full px-4 py-3 min-h-[48px] bg-white/[0.05] border border-white/10 rounded-lg font-body text-sm text-star placeholder:text-dust/40"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full py-3 min-h-[48px] bg-gradient-to-r from-amber to-amber/80 text-space font-body text-sm font-semibold rounded-lg"
          >
            Sign In
          </button>
        </form>

        <noscript>
          <p className="mt-4 text-center font-body text-xs text-dust/60">
            JavaScript is required for the full sign-in experience.{' '}
            <a href="/login" className="text-amber">Reload the page</a> with JS enabled.
          </p>
        </noscript>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}
