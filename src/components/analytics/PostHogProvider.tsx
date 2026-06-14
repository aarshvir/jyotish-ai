'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

// Public, client-side project token (safe to ship). EU Cloud region.
// Env vars override if you ever want to, but none are required.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_mwtEwkk3KoTfFuuqpKSUETY3tparzfMwX8LdBBhfuE9n';
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let initialized = false;

// --- First-party tracking → /api/track (powers the in-portal admin funnel + per-user journey) ---
function sessionId(): string {
  try {
    let id = localStorage.getItem('vh_sid');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('vh_sid', id); }
    return id;
  } catch { return 'anon'; }
}
function parseUtm(): Record<string, string> {
  const u: Record<string, string> = {};
  try {
    const p = new URLSearchParams(window.location.search);
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const v = p.get(k);
      if (v) u[k] = v;
    }
  } catch { /* ignore */ }
  return u;
}
export function track(name: string, props: Record<string, unknown> = {}) {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        name,
        path: window.location.pathname,
        referrer: document.referrer || null,
        utm: parseUtm(),
        session_id: sessionId(),
        props,
      }),
    }).catch(() => {});
  } catch { /* analytics must never break the page */ }
}

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
    track('page_view'); // first-party, for the in-portal funnel + journey
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

    // One first-party "session_start" per browser-tab session → login/visit counting.
    try {
      if (!sessionStorage.getItem('vh_session_started')) {
        sessionStorage.setItem('vh_session_started', '1');
        track('session_start');
      }
    } catch { /* ignore */ }

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
