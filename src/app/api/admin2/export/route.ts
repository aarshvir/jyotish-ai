export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { parseRange } from '@/lib/admin2/load';
import { funnelView } from '@/lib/admin2/views';

/** CSV of the funnel breakdown by slug or source (internal traffic excluded unless internal=1). */
export async function GET(req: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const range = parseRange(sp);
  const kind = sp.kind === 'source' ? 'source' : 'slug';
  const f = await funnelView(range);
  const rows = kind === 'source' ? f.bySource : f.bySlug;

  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [kind, 'visitors', 'quiz_starts', 'offer_views', 'payers', 'conversion_pct', 'revenue_inr', 'revenue_per_visitor_inr'];
  const lines = [header.join(',')].concat(
    rows.map((r) => [r.key, r.visitors, r.quizStarts, r.offers, r.payers, r.convPct ?? '', r.revenueInr, r.rpvInr ?? ''].map(esc).join(',')),
  );
  const day = new Date(range.now).toISOString().slice(0, 10);
  return new NextResponse(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vedichour-funnel-by-${kind}-${range.days}d-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
