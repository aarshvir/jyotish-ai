import { Suspense } from 'react';
import type { Metadata } from 'next';
import OnboardForm from './_OnboardForm';

export const metadata: Metadata = {
  title: 'Generate Your Jyotish Forecast | VedicHour',
  description:
    'Enter your birth details to generate a personalised AI-powered Vedic astrology forecast with 18 hourly windows per day. Free Kundli included.',
  robots: { index: false, follow: true },
};

/**
 * Static form shell rendered on SSR / by crawlers and as Suspense fallback.
 * Matches step-0 (About You) visual structure so layout does not shift on hydration.
 */
function OnboardShell() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-space flex flex-col items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-md">
        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="font-mono text-label-sm text-amber tracking-[0.12em] uppercase">
              About You
            </span>
            <span className="font-mono text-mono-sm text-dust/40">Step 1 of 3</span>
          </div>
          <div className="h-1 bg-horizon/30 rounded-pill overflow-hidden">
            <div className="h-full bg-amber rounded-pill" style={{ width: '33%' }} />
          </div>
        </div>

        {/* Form card */}
        <div className="card p-7 md:p-8">
          <form>
            <h1 className="font-body font-semibold text-star text-headline-lg mb-1.5">
              Your Jyotish Forecast
            </h1>
            <p className="font-body text-body-sm text-dust mb-6">
              We need a few details to calculate your personalised Vedic forecast.
            </p>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="onboard-name"
                  className="font-mono text-label-sm text-dust/80 tracking-[0.1em] uppercase block mb-1.5"
                >
                  Your name
                </label>
                <input
                  id="onboard-name"
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  autoComplete="given-name"
                  className="cosmic-input"
                />
              </div>

              <div>
                <label
                  htmlFor="onboard-email"
                  className="font-mono text-label-sm text-dust/80 tracking-[0.1em] uppercase block mb-1.5"
                >
                  Email
                </label>
                <input
                  id="onboard-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  className="cosmic-input"
                />
              </div>

              <button
                type="button"
                className="btn-primary w-full py-3"
              >
                Continue — Birth Details →
              </button>
            </div>
          </form>
        </div>

        <noscript>
          <p className="mt-4 text-center font-body text-sm text-dust/60">
            JavaScript is required for the onboarding form.{' '}
            <a href="/onboard" className="text-amber underline">Reload with JS enabled.</a>
          </p>
        </noscript>
      </div>
    </main>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<OnboardShell />}>
      <OnboardForm />
    </Suspense>
  );
}
