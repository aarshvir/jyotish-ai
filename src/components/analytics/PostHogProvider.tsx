'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

// Public, client-side project token (safe to ship). EU Cloud region.
// Env vars override if you ever want to, but none are required.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_mwtEwkk3KoTfFuuqpKSUETY3tparzfMwX8LdBBhfuE9n';
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let initialized = false;

/** Manual SPA pageview capture on route change (capture_pageview is disabled in init). */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!initialized || !pathname) return;
    let url = window.location.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);
  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized || !KEY) return;
    initialized = true;
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false, // captured manually on route change (App Router)
      capture_pageleave: true, // time-on-page
      autocapture: true, // clicks, form interactions
      person_profiles: 'identified_only',
      session_recording: { maskAllInputs: true }, // scroll/rage-clicks/replays; inputs masked for privacy
    });

    // Best-effort: link events to the signed-in user for per-user analysis.
    import('@/lib/supabase/client')
      .then(({ createClient }) => {
        try {
          const sb = createClient();
          void sb.auth.getUser().then(({ data }) => {
            if (data.user?.email) {
              posthog.identify(data.user.id, { email: data.user.email });
            }
          });
        } catch {
          /* anonymous analytics still work */
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  );
}
