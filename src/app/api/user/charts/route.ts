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
  unavailable: { kundali: boolean; synastry: boolean };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;
  const headers = { 'Cache-Control': 'no-store' };
  const unavailable = { kundali: false, synastry: false };
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ kundali: [], synastry: [], unavailable: { kundali: true, synastry: true } } satisfies UserChartsResponse, { status: 503, headers });
  }

  // Explicit owner filters complement RLS. Each collection can fail independently.
  async function loadKundali(): Promise<KundaliChartSummary[]> {
    try {
      const { data, error } = await supabase
        .from('kundali_charts')
        .select('id, person, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map(row => {
        const person = (row.person ?? {}) as { name?: unknown };
        return { id: row.id as string, name: typeof person.name === 'string' && person.name.trim() ? person.name.trim() : 'Your Kundli', created_at: row.created_at as string };
      });
    } catch {
      unavailable.kundali = true;
      return [];
    }
  }

  async function loadSynastry(): Promise<SynastryChartSummary[]> {
    try {
      const { data, error } = await supabase
        .from('synastry_charts')
        .select('id, partner_a, partner_b, ashtakoot, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map(row => {
        const a = (row.partner_a ?? {}) as { name?: unknown };
        const b = (row.partner_b ?? {}) as { name?: unknown };
        const match = (row.ashtakoot ?? {}) as { total?: unknown };
        return {
          id: row.id as string,
          partnerA: typeof a.name === 'string' && a.name.trim() ? a.name.trim() : 'Partner A',
          partnerB: typeof b.name === 'string' && b.name.trim() ? b.name.trim() : 'Partner B',
          score: typeof match.total === 'number' && Number.isFinite(match.total) ? match.total : null,
          created_at: row.created_at as string,
        };
      });
    } catch {
      unavailable.synastry = true;
      return [];
    }
  }

  const [kundali, synastry] = await Promise.all([loadKundali(), loadSynastry()]);
  return NextResponse.json({ kundali, synastry, unavailable } satisfies UserChartsResponse, { headers });
}
