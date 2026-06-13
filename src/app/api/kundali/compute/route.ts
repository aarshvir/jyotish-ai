export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import type { NatalChartData } from '@/lib/agents/types';
import { plainify } from '@/lib/utils/plainify';

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

  // Access gate: any paid forecast OR a standalone Kundali unlock.
  const { count } = await db
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('payment_status', 'paid');

  let hasKundaliUnlock = false;
  const { data: unlockRow } = await db
    .from('user_kundali_unlock')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  hasKundaliUnlock = !!unlockRow?.user_id;

  if ((count ?? 0) < 1 && !hasKundaliUnlock) {
    return NextResponse.json(
      { error: 'Unlock your Kundali analysis to continue.', code: 'PAYMENT_REQUIRED' },
      { status: 402 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { person?: BirthPayload };
  const p = body.person;
  if (!p?.birth_date || !p.birth_lat || !p.birth_lng) {
    return NextResponse.json({ error: 'Birth date and a located birth city are required.' }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const h = {
    'Content-Type': 'application/json',
    'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  };

  // 1) Natal chart from the ephemeris service
  const chartRes = await fetch(`${origin}/api/agents/ephemeris`, {
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
  if (!chartRes.ok) {
    return NextResponse.json({ error: 'Birth chart calculation failed.' }, { status: 502 });
  }
  const chartJson = await chartRes.json();
  const chart = (chartJson.data ?? chartJson) as NatalChartData;

  const lagna = chart.lagna ?? 'Unknown';
  const moon = chart.planets?.Moon;
  const md = chart.current_dasha?.mahadasha ?? 'Unknown';
  const ad = chart.current_dasha?.antardasha ?? 'Unknown';

  // 2) Plain-language chart reading from the nativity-text agent
  let lagna_analysis = '';
  let dasha_interpretation = '';
  try {
    const natRes = await fetch(`${origin}/api/commentary/nativity-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') ?? '' },
      body: JSON.stringify({
        lagnaSign: lagna,
        lagnaDegreee: chart.lagna_degree ?? 0,
        moonSign: moon?.sign ?? 'Unknown',
        moonNakshatra: moon?.nakshatra ?? chart.moon_nakshatra ?? 'Unknown',
        mahadasha: md,
        antardasha: ad,
        md_end: chart.current_dasha?.end_date ?? '',
        ad_end: '',
        planets: chart.planets ?? {},
      }),
      signal: AbortSignal.timeout(80_000),
    });
    if (natRes.ok || natRes.status === 206) {
      const nat = await natRes.json();
      lagna_analysis = nat.lagna_analysis ?? '';
      dasha_interpretation = nat.dasha_interpretation ?? '';
    }
  } catch {
    // fall through to deterministic fallback below
  }

  // Warm deterministic fallback (never store empty/jargon)
  if (!lagna_analysis.trim() || lagna_analysis.trim().length < 120) {
    lagna_analysis =
      `Your chart has ${lagna} as the rising sign, with the Moon in ${moon?.sign ?? 'your Moon sign'} — together these shape how you naturally approach life, relationships, and opportunity. You are currently in your ${md} period${ad !== 'Unknown' ? `, with ${ad} as the active sub-period` : ''}: a chapter that brings ${md}'s qualities and themes to the foreground.`;
  }
  if (!dasha_interpretation.trim()) {
    dasha_interpretation =
      `Your ${md} main period${ad !== 'Unknown' ? ` and ${ad} sub-period are` : ' is'} active right now — the chapter that colours what feels most pressing and rewarding in your life. Use your strongest days for decisions that require commitment.`;
  }

  lagna_analysis = plainify(lagna_analysis);
  dasha_interpretation = plainify(dasha_interpretation);

  // 3) Persist
  const { data: inserted, error: insErr } = await db
    .from('kundali_charts')
    .insert({
      user_id: auth.user.id,
      person: { ...p, name: p.name || 'You' },
      chart: {
        lagna,
        lagna_degree: chart.lagna_degree ?? 0,
        moon_sign: moon?.sign ?? '',
        moon_nakshatra: moon?.nakshatra ?? chart.moon_nakshatra ?? '',
        current_dasha: chart.current_dasha ?? null,
        dasha_sequence: chart.dasha_sequence ?? [],
        planets: chart.planets ?? {},
      },
      lagna_analysis,
      dasha_interpretation,
      life_themes: [],
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    console.error('[kundali/compute]', insErr);
    return NextResponse.json({ error: 'Failed to save your Kundali.' }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id, lagna_analysis, dasha_interpretation });
}
