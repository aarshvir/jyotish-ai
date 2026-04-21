export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import type { NatalChartData } from '@/lib/agents/types';
import { computeAshtakoot, NAKSHATRA_NAMES } from '@/lib/synastry/ashtakoot';
import { buildSynastryCommentary } from '@/lib/synastry/synastryCommentary';

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

function signToIndex(sign: string): number {
  const i = SIGNS.findIndex((s) => s.toLowerCase() === sign.trim().toLowerCase());
  return i >= 0 ? i : 0;
}

function nakshatraToIndex(name: string): number {
  const i = NAKSHATRA_NAMES.findIndex(
    (n) => n.toLowerCase() === name.trim().toLowerCase(),
  );
  return i >= 0 ? i : 0;
}

type BirthPayload = {
  name?: string;
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_lat: number;
  birth_lng: number;
};

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const db = createServiceClient();
  const { count, error: cntErr } = await db
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('payment_status', 'paid');

  if (cntErr) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  let hasSynUnlock = false;
  const { data: unlockRow, error: unlockErr } = await db
    .from('user_synastry_unlock')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (unlockErr) {
    console.warn('[synastry/compute] user_synastry_unlock lookup:', unlockErr.message);
  } else {
    hasSynUnlock = !!unlockRow?.user_id;
  }

  const hasPaidReport = (count ?? 0) >= 1;
  if (!hasPaidReport && !hasSynUnlock) {
    return NextResponse.json(
      {
        error:
          'Synastry requires any paid VedicHour forecast or a standalone Synastry unlock checkout.',
        code: 'PAYMENT_REQUIRED',
      },
      { status: 402 },
    );
  }

  const body = await request.json().catch(() => ({})) as {
    partnerA?: BirthPayload;
    partnerB?: BirthPayload;
  };
  const a = body.partnerA;
  const b = body.partnerB;
  if (!a?.birth_date || !b?.birth_date) {
    return NextResponse.json({ error: 'partnerA and partnerB birth data required' }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const h = {
    'Content-Type': 'application/json',
    'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  };

  async function chart(p: BirthPayload): Promise<NatalChartData | null> {
    const res = await fetch(`${origin}/api/agents/ephemeris`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        type: 'natal-chart',
        birth_date: p.birth_date,
        birth_time: p.birth_time || '12:00:00',
        birth_city: p.birth_city || 'Unknown',
        birth_lat: p.birth_lat,
        birth_lng: p.birth_lng,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return (j.data ?? j) as NatalChartData;
  }

  const [chartA, chartB] = await Promise.all([chart(a), chart(b)]);
  if (!chartA || !chartB) {
    return NextResponse.json({ error: 'Birth chart calculation failed' }, { status: 502 });
  }

  const moonA = chartA.planets?.Moon;
  const moonB = chartB.planets?.Moon;
  const nakA = nakshatraToIndex(moonA?.nakshatra ?? chartA.moon_nakshatra ?? 'Ashwini');
  const nakB = nakshatraToIndex(moonB?.nakshatra ?? chartB.moon_nakshatra ?? 'Ashwini');
  const sigA = signToIndex(moonA?.sign ?? 'Aries');
  const sigB = signToIndex(moonB?.sign ?? 'Aries');

  const ashtakoot = computeAshtakoot({
    moonNakshatraIndexA: nakA,
    moonNakshatraIndexB: nakB,
    moonSignIndexA: sigA,
    moonSignIndexB: sigB,
  });

  let commentary: string;
  try {
    commentary = await buildSynastryCommentary(ashtakoot);
  } catch (e) {
    console.warn('[synastry/compute] commentary RAG failed, using fallback:', e);
    commentary =
      `Ashtakoot total ${ashtakoot.total} / ${ashtakoot.max}. ` +
      `Varna through Nadi measure emotional, physical, and procreative harmony. ` +
      `Scores above 24 are generally favourable for partnership; below 18 suggests more conscious work — always read the full charts with a qualified Jyotishi.`;
  }

  const { data: inserted, error: insErr } = await db
    .from('synastry_charts')
    .insert({
      user_id: auth.user.id,
      partner_a: { ...a, moon_nakshatra: moonA?.nakshatra },
      partner_b: { ...b, moon_nakshatra: moonB?.nakshatra },
      ashtakoot: ashtakoot as unknown as Record<string, unknown>,
      commentary,
      plan_gate: hasSynUnlock && !hasPaidReport ? 'synastry_unlock' : 'paid_report',
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    console.error('[synastry/compute]', insErr);
    return NextResponse.json({ error: 'Failed to save synastry' }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id, ashtakoot, commentary });
}
