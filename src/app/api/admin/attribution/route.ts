export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { toUsdCents } from '@/lib/admin/analytics';

function channelOf(source?: string | null, medium?: string | null): string {
  const s = (source ?? '').toLowerCase();
  const m = (medium ?? '').toLowerCase();
  if (!s || s === 'direct') return 'Direct';
  if (/google|bing|duckduckgo|yahoo|ecosia/.test(s)) return 'Organic Search';
  if (m === 'social' || /instagram|facebook|youtube|tiktok|reddit|twitter|x\.com|linkedin|pinterest|whatsapp|threads|quora/.test(s)) return 'Social / Community';
  if (/google_ads|meta_ads|fb_ads|paid/.test(s) || m === 'cpc' || m === 'paid') return 'Paid Ads';
  if (m === 'creator' || m === 'partner' || s === 'partner') return 'Partner / Creator';
  return `Referral · ${source}`;
}

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const db = createServiceClient();
  const profRes = await db.from('user_profiles').select('id, first_touch_source, first_touch_medium').limit(50000);
  if (profRes.error) {
    return NextResponse.json({ channels: [], note: 'Run the first-touch migration (20260615_first_touch_attribution.sql), then this fills in as new users sign up.' });
  }
  const profiles = profRes.data ?? [];
  const paymentsRes = await db.from('ziina_payments').select('user_id, amount, currency, status').eq('status', 'completed').limit(50000);
  const payments = paymentsRes.data ?? [];

  const revByUser: Record<string, number> = {};
  const paidUsers = new Set<string>();
  for (const p of payments) {
    const row = p as { user_id?: string; amount?: number; currency?: string };
    if (!row.user_id) continue;
    revByUser[row.user_id] = (revByUser[row.user_id] ?? 0) + toUsdCents(row.amount ?? 0, row.currency ?? 'USD');
    paidUsers.add(row.user_id);
  }

  const agg: Record<string, { signups: number; paid: number; revenueUsd: number }> = {};
  let withFirstTouch = 0;
  for (const p of profiles) {
    const row = p as { id: string; first_touch_source?: string | null; first_touch_medium?: string | null };
    if (row.first_touch_source) withFirstTouch++;
    const ch = channelOf(row.first_touch_source, row.first_touch_medium);
    agg[ch] = agg[ch] ?? { signups: 0, paid: 0, revenueUsd: 0 };
    agg[ch].signups++;
    if (paidUsers.has(row.id)) agg[ch].paid++;
    agg[ch].revenueUsd += revByUser[row.id] ?? 0;
  }

  const channels = Object.entries(agg)
    .map(([channel, v]) => ({ channel, ...v, convPct: v.signups ? Math.round((v.paid / v.signups) * 1000) / 10 : 0 }))
    .sort((a, b) => b.revenueUsd - a.revenueUsd || b.signups - a.signups);

  return NextResponse.json({
    channels,
    totalProfiles: profiles.length,
    withFirstTouch,
    note: withFirstTouch === 0 ? 'No first-touch data yet — it populates as new users sign up after this deploy.' : null,
  });
}
