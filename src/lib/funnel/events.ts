'use client';

import { track } from '@/components/analytics/PostHogProvider';

/**
 * Funnel events (spec §8). Every event carries the funnel session, slug, UTM, click ids
 * and geo, and goes to the first-party analytics_events table via track(). Meta Pixel
 * events carry an event_id built from the funnel session, so a later server-side
 * Conversions API send can be de-duplicated against them.
 */

export interface EventContext {
  sessionId: string;
  slug: string;
  lang: string;
  utm: Record<string, string>;
  fbclid: string | null;
  gclid: string | null;
  geo: string | null;
  flags: Record<string, string>;
}

export function funnelEvent(ctx: EventContext, name: string, props: Record<string, unknown> = {}): void {
  track(name, {
    ...props,
    funnel_session: ctx.sessionId,
    slug: ctx.slug,
    lang: ctx.lang,
    geo: ctx.geo,
    fbclid: ctx.fbclid,
    gclid: ctx.gclid,
    ...ctx.utm,
    ...Object.fromEntries(Object.entries(ctx.flags).map(([k, v]) => [`flag_${k}`, v])),
  });
}

export function pixelEvent(ctx: EventContext, event: 'Lead' | 'CompleteRegistration' | 'InitiateCheckout', suffix: string, params: Record<string, unknown> = {}): void {
  try {
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    w.fbq?.('track', event, { content_name: ctx.slug, ...params }, { eventID: `${ctx.sessionId}:${suffix}` });
  } catch {
    /* analytics must never break the page */
  }
}
