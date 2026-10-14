'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { PostHog } from 'posthog-js';
import { analyticsConsentGuard, analyticsRoute, clearOptionalAnalyticsStorage, hasAnalyticsConsent, publicAnalyticsPath, registerAnalyticsCleanup, safeAnalyticsProperties, sendOptionalAnalytics } from '@/lib/analytics/consent';
import { useAnalyticsConsent } from '@/lib/analytics/useAnalyticsConsent';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
let instance: PostHog | null = null;
let active = false;
let sdkRequestController: AbortController | null = null;

function publicLocation() {
  if (typeof window === 'undefined' || window.location.search || window.location.hash) return null;
  return publicAnalyticsPath(window.location.pathname);
}

const events = new Set([
  'page_view', 'session_start', 'calculator_submitted', 'calculator_result', 'calculator_failed',
  'result_shared', 'kundali_subscribe_cta', 'synastry_subscribe_cta', 'subscriber_next_forecast',
  'paywall_view', 'quiz_step', 'quiz_signup_shown', 'quiz_signup_done', 'checkout_started',
  'onboard_step', 'plan_selected', 'winback_resumed',
]);

export function track(name: string, properties: Record<string, unknown> = {}) {
  if (!hasAnalyticsConsent() || !events.has(name)) return;
  sendOptionalAnalytics('/api/track', {
    name, path: analyticsRoute(window.location.pathname), props: safeAnalyticsProperties(properties),
  });
}

export function stopPostHog() {
  active = false;
  sdkRequestController?.abort();
  const sdk = instance ?? (typeof window !== 'undefined' ? (window as unknown as { posthog?: PostHog }).posthog : null);
  try { sdk?.set_config({ cookieless_mode: undefined, autocapture: false, capture_pageleave: false, disable_session_recording: true }); } catch {}
  try { sdk?.stopSessionRecording(); } catch {}
  try { sdk?.opt_out_capturing(); } catch {}
}

function capturePageview() {
  const route = publicLocation();
  if (active && instance && hasAnalyticsConsent() && route) {
    instance.capture('$pageview', { $current_url: window.location.origin + route, $pathname: route });
  }
}

export async function initializePostHog(load: () => Promise<{ default: PostHog }> = () => import('posthog-js')) {
  if (!KEY || !hasAnalyticsConsent() || !publicLocation()) return;
  const current = analyticsConsentGuard();
  try {
    const requestOptions = () => {
      sdkRequestController = new AbortController();
      // The installed SDK passes fetch_options through as RequestInit; aborted generations cannot retry later.
      return { cache: 'no-store' as const, signal: sdkRequestController.signal, referrerPolicy: 'no-referrer' as const, keepalive: false };
    };
    if (!instance) {
      const { default: sdk } = await load();
      if (!current() || !publicLocation()) return;
      instance = sdk.init(KEY, {
        api_host: HOST,
        api_transport: 'fetch',
        disable_beacon: true,
        request_batching: false,
        fetch_options: requestOptions(),
        persistence: 'memory',
        disable_persistence: true,
        opt_out_capturing_by_default: true,
        opt_out_persistence_by_default: true,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_performance: false,
        capture_exceptions: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_external_dependency_loading: true,
        advanced_disable_flags: true,
        save_referrer: false,
        save_campaign_params: false,
        person_profiles: 'never',
        before_send: event => {
          const route = publicLocation();
          if (!event || event.event !== '$pageview' || !active || !hasAnalyticsConsent() || !route) return null;
          // Replace SDK-enriched properties instead of trying to blacklist every private URL field.
          event.properties = {
            token: KEY,
            ...(typeof event.properties.distinct_id === 'string' && /^[a-f0-9-]{16,64}$/i.test(event.properties.distinct_id) ? { distinct_id: event.properties.distinct_id } : {}),
            $current_url: window.location.origin + route,
            $pathname: route,
          };
          return event;
        },
      }) ?? sdk;
    } else instance.set_config({ fetch_options: requestOptions() });
    if (!current() || !publicLocation()) { stopPostHog(); return; }
    active = true;
    instance.opt_in_capturing({ captureEventName: false });
    if (!current()) { stopPostHog(); return; }
    capturePageview();
  } catch { stopPostHog(); }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();
  useEffect(() => {
    return () => { stopPostHog(); };
  }, []);
  useEffect(() => {
    if (!consent.allowed) {
      stopPostHog();
      if (!hasAnalyticsConsent()) clearOptionalAnalyticsStorage();
      return;
    }
    track('page_view');
    if (pathname && publicAnalyticsPath(pathname)) void initializePostHog();
    else stopPostHog();
  }, [pathname, consent.allowed, consent.revision]);
  return <>{children}</>;
}

registerAnalyticsCleanup(stopPostHog);
