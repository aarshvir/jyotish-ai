'use client';

import { trackEvent } from '@/lib/analytics/client';
import { fbqTrack } from '@/components/analytics/MetaPixel';
import type { ClientEventName } from '@/lib/analytics/events';

/**
 * Funnel events (spec §8) through the canonical tracker (src/lib/analytics/client.ts).
 * That tracker stamps session id, slug, UTM, click ids and landing path, and the ingest
 * route stamps geo, and it drops any property not allow-listed in analytics/events.ts —
 * so no name, birth detail, email or phone number can leave through here.
 *
 * Meta Pixel events carry an event_id built from the funnel session, so a later
 * server-side Conversions API send can be de-duplicated against them.
 */

export interface EventContext {
  sessionId: string;
  slug: string;
  lang: string;
  geo: string | null;
  flags: Record<string, string>;
}

export function funnelEvent(ctx: EventContext, name: ClientEventName, props: Record<string, unknown> = {}): void {
  trackEvent(name, props, { slug: ctx.slug });
}

export function pixelEvent(ctx: EventContext, event: 'Lead' | 'CompleteRegistration' | 'InitiateCheckout', suffix: string, params: Record<string, unknown> = {}): void {
  fbqTrack(event, { content_name: ctx.slug, ...params, eventID: `${ctx.sessionId}:${suffix}` });
}
