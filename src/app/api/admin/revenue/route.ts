export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { toUsdCents } from '@/lib/admin/analytics';

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const db = createServiceClient();
  const [payRes, promoRes] = await Promise.all([
    db.from('ziina_payments').select('amount, currency, plan_type, promo_code_id, status').eq('status', 'completed').limit(50000),
    db.from('promo_codes').select('id, code, discount_pct'),
  ]);
  const payments = payRes.data ?? [];
  const promoById: Record<string, { code: string; pct: number }> = {};
  for (const p of promoRes.data ?? []) {
    const row = p as { id: string; code: string; discount_pct: number };
    promoById[row.id] = { code: row.code, pct: row.discount_pct };
  }

  const byPlan: Record<string, { orders: number; usd: number }> = {};
  const byCurrency: Record<string, { orders: number; minor: number }> = {};
  const couponUse: Record<string, { code: string; uses: number; giveawayUsd: number }> = {};
  let totalUsd = 0, orders = 0, couponOrders = 0;

  for (const p of payments) {
    const row = p as { amount?: number; currency?: string; plan_type?: string; promo_code_id?: string | null };
    const cur = (row.currency ?? 'USD').toUpperCase();
    const usd = toUsdCents(row.amount ?? 0, cur);
    const plan = row.plan_type ?? 'unknown';
    totalUsd += usd; orders++;
    byPlan[plan] = byPlan[plan] ?? { orders: 0, usd: 0 };
    byPlan[plan].orders++; byPlan[plan].usd += usd;
    byCurrency[cur] = byCurrency[cur] ?? { orders: 0, minor: 0 };
    byCurrency[cur].orders++; byCurrency[cur].minor += row.amount ?? 0;
    if (row.promo_code_id && promoById[row.promo_code_id]) {
      couponOrders++;
      const { code, pct } = promoById[row.promo_code_id];
      // amount is the already-discounted charge; estimate the given-away value.
      const giveaway = pct > 0 && pct < 100 ? Math.round(usd * (pct / (100 - pct))) : 0;
      couponUse[code] = couponUse[code] ?? { code, uses: 0, giveawayUsd: 0 };
      couponUse[code].uses++; couponUse[code].giveawayUsd += giveaway;
    }
  }

  return NextResponse.json({
    totalUsd,
    orders,
    aovUsd: orders ? Math.round(totalUsd / orders) : 0,
    couponOrders,
    byPlan: Object.entries(byPlan).map(([plan, v]) => ({ plan, ...v })).sort((a, b) => b.usd - a.usd),
    byCurrency: Object.entries(byCurrency).map(([currency, v]) => ({ currency, ...v })),
    coupons: Object.values(couponUse).sort((a, b) => b.uses - a.uses),
    refunds: { note: 'Refund capture is not yet wired into ziina_payments — refund rate shows once the Ziina refund webhook is enabled.', count: 0 },
  });
}
