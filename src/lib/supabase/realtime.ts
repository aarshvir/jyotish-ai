/**
 * Pillar 1: Supabase Realtime subscription helper for report rows.
 *
 * Returns an unsubscribe function. On every UPDATE to the `reports` row with
 * the given id, the callback is invoked with the new row snapshot.
 *
 * Requires the Supabase migration `20260419_reports_realtime.sql` to have
 * added `public.reports` to the `supabase_realtime` publication.
 */

import { createClient } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ReportRealtimeSnapshot {
  id: string;
  status: string | null;
  generation_step: string | null;
  generation_progress: number | null;
  generation_trace_id?: string | null;
  generation_error_code?: string | null;
  generation_error_at_phase?: string | null;
  report_data: Record<string, unknown> | null;
  payment_status: string | null;
  updated_at: string | null;
}

/**
 * Subscribe to UPDATE events on a specific reports row.
 * Caller should invoke the returned cleanup function on unmount.
 */
export function subscribeToReport(
  reportId: string,
  onUpdate: (row: ReportRealtimeSnapshot) => void,
  onStateChange?: (state: 'subscribing' | 'joined' | 'error' | 'closed') => void,
): () => void {
  const supabase = createClient();
  let channel: RealtimeChannel | null = null;
  let closed = false;

  onStateChange?.('subscribing');

  try {
    channel = supabase
      .channel(`report:${reportId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: `id=eq.${reportId}`,
        },
        (payload) => {
          if (closed) return;
          const row = payload.new as ReportRealtimeSnapshot;
          if (row && row.id === reportId) onUpdate(row);
        },
      )
      .subscribe((status) => {
        if (closed) return;
        if (status === 'SUBSCRIBED') onStateChange?.('joined');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStateChange?.('error');
        else if (status === 'CLOSED') onStateChange?.('closed');
      });
  } catch (err) {
    console.warn('[realtime] subscribe failed, falling back to polling:', err);
    onStateChange?.('error');
  }

  return () => {
    closed = true;
    if (channel) {
      try {
        void supabase.removeChannel(channel);
      } catch {
        // best-effort cleanup
      }
    }
  };
}
