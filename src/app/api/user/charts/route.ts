export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';

export interface KundaliChartSummary {
  id: string;
  name: string;
  created_at: string;
}

export interface SynastryChartSummary {
  id: string;
  partnerA: string;
  partnerB: string;
  score: number | null;
  created_at: string;
}

export interface UserChartsResponse {
  kundali: KundaliChartSummary[];
  synastry: SynastryChartSummary[];
}

/**
 * GET /api/user/charts
 * Lists the authenticated user's saved standalone Kundali and Synastry charts,
 * newest-first. RLS on both tables (owner-only SELECT) scopes the rows — we use
 * the user's Supabase client, not service-role. Each table is queried
 * defensively so a missing table (not yet migrated) yields an empty array
 * rather than a 500.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createClient();

  // kundali_charts: person JSONB has a `name` key (see /kundali/[id]/page.tsx).
  const kundali: KundaliChartSummary[] = await supabase
    .from('kundali_charts')
    .select('id, person, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
    .then(({ data, error }) => {
      if (error) {
        console.warn('[/api/user/charts] kundali query failed:', error.message);
        return [];
      }
      return (data ?? []).map((row) => {
        const person = (row.person ?? {}) as { name?: string };
        return {
          id: row.id as string,
          name: person.name?.trim() || 'Your Kundli',
          created_at: row.created_at as string,
        };
      });
    }, () => []);

  // synastry_charts: partner_a/partner_b JSONB have `name`; ashtakoot JSONB has
  // `total` (see /synastry/[id]/page.tsx).
  const synastry: SynastryChartSummary[] = await supabase
    .from('synastry_charts')
    .select('id, partner_a, partner_b, ashtakoot, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
    .then(({ data, error }) => {
      if (error) {
        console.warn('[/api/user/charts] synastry query failed:', error.message);
        return [];
      }
      return (data ?? []).map((row) => {
        const a = (row.partner_a ?? {}) as { name?: string };
        const b = (row.partner_b ?? {}) as { name?: string };
        const ak = (row.ashtakoot ?? {}) as { total?: number };
        return {
          id: row.id as string,
          partnerA: a.name?.trim() || 'Partner A',
          partnerB: b.name?.trim() || 'Partner B',
          score: typeof ak.total === 'number' ? ak.total : null,
          created_at: row.created_at as string,
        };
      });
    }, () => []);

  const payload: UserChartsResponse = { kundali, synastry };
  return NextResponse.json(payload);
}
