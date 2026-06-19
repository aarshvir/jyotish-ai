export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { hasValidBirthCoords } from '@/lib/utils/coords';
import { checkRateLimit, RATE_LIMITS } from '@/lib/api/rateLimit';
import { createServiceClient } from '@/lib/supabase/admin';
import type { NatalChartData } from '@/lib/agents/types';
import { plainify } from '@/lib/utils/plainify';
import { buildDeepKundli } from '@/lib/kundli/deepKundli';
import { buildKundliCommentary, type KundliSections } from '@/lib/kundli/kundliCommentary';

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

  // One entitlement shouldn't be replayable into unbounded LLM spend (the deep compute
  // runs Anthropic/OpenAI calls with maxDuration=300). Per-user sliding-window cap.
  const rl = await checkRateLimit(`compute:${auth.user.id}`, RATE_LIMITS.compute.limit, RATE_LIMITS.compute.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many deep-report requests — please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const db = createServiceClient();

  // Access gate: any paid/promo forecast OR a standalone Kundali unlock.
  // Surface a count-query error as a retryable 500 (mirrors synastry/compute) so a
  // transient DB failure can't masquerade as count=0 and wrongly 402 a paid user.
  const { count, error: cntErr } = await db
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .in('payment_status', ['paid', 'promo']);
  if (cntErr) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

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
  if (!p?.birth_date || !hasValidBirthCoords(p)) {
    return NextResponse.json({ error: 'Birth date and a located birth city are required.' }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const h = {
    'Content-Type': 'application/json',
    'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  };

  // 1) Natal chart from the ephemeris service (deterministic, Swiss Ephemeris / Lahiri)
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

  // 1b) Best-effort current Saturn sign for Sade Sati (date-only is sufficient for sidereal sign).
  let currentSaturnSign: string | undefined;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const nowRes = await fetch(`${origin}/api/agents/ephemeris`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        type: 'natal-chart',
        birth_date: today,
        birth_time: '12:00:00',
        birth_city: p.birth_city || 'Unknown',
        birth_lat: p.birth_lat,
        birth_lng: p.birth_lng,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (nowRes.ok) {
      const nowJson = await nowRes.json();
      const nowChart = (nowJson.data ?? nowJson) as NatalChartData;
      currentSaturnSign = nowChart.planets?.Saturn?.sign;
    }
  } catch {
    // Sade Sati will report "pending live transit" — non-fatal.
  }

  const moon = chart.planets?.Moon;

  // 2) Deterministic deep engine: divisional charts, doshas, 5-year dasha seeds.
  const deep = buildDeepKundli(chart, { currentSaturnSign });

  // 3) Scripture-grounded narrative (overview + 7 life areas + 5-year outlook).
  let sections: KundliSections;
  try {
    sections = await buildKundliCommentary(chart, deep, p.name || 'You');
  } catch (e) {
    console.error('[kundali/compute] commentary failed, using minimal fallback:', e);
    sections = {
      overview:
        `Your chart has ${chart.lagna ?? 'your rising sign'} rising with the Moon in ${moon?.sign ?? 'your Moon sign'}. ` +
        `You are currently in your ${chart.current_dasha?.mahadasha ?? 'current'} life period.`,
      lifeAreas: {
        life: '', career_finances: '', relationships: '',
        marriage_intimacy: '', health: '', children: '', family: '',
      },
      yearOutlook: [],
    };
  }

  const overview = plainify(sections.overview || '');
  const lifeAreas = Object.fromEntries(
    Object.entries(sections.lifeAreas || {}).map(([k, v]) => [k, plainify(String(v || ''))]),
  );
  const yearOutlook = (sections.yearOutlook || []).map((y) => ({
    year: y.year,
    text: plainify(String(y.text || '')),
  }));

  // Back-compat scalar fields the older result view still reads.
  const lagna_analysis = overview;
  const dasha_interpretation =
    yearOutlook[0]?.text ||
    `You are in your ${chart.current_dasha?.mahadasha ?? 'current'} period — the chapter that colours what feels most pressing right now.`;

  // 4) Persist the full deep report.
  const { data: inserted, error: insErr } = await db
    .from('kundali_charts')
    .insert({
      user_id: auth.user.id,
      person: { ...p, name: p.name || 'You' },
      chart: {
        lagna: chart.lagna ?? 'Unknown',
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
      overview,
      vargas: deep.vargas as unknown as Record<string, unknown>,
      doshas: deep.doshas as unknown as Record<string, unknown>,
      yogas: [],
      life_areas: lifeAreas,
      year_outlook: yearOutlook,
      engine_version: 'deep-v1',
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    console.error('[kundali/compute]', insErr);
    return NextResponse.json({ error: 'Failed to save your Kundali.' }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id, overview, lifeAreas, yearOutlook });
}
