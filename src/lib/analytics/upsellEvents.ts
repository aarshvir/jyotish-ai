import { createServiceClient } from '@/lib/supabase/admin';

export type UpsellEventName =
  | 'upsell_shown'
  | 'upsell_dismissed'
  | 'upsell_checkout_started'
  | 'upsell_completed';

export async function emitUpsellEvent(
  userId: string | null,
  eventName: UpsellEventName,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const db = createServiceClient();
    await db.from('analytics_events').insert({
      user_id: userId,
      event_name: eventName,
      properties: { ...properties, ts: new Date().toISOString() },
    });
  } catch {
    // Non-fatal — analytics table may not be migrated yet
  }
}
