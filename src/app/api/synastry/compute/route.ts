export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/api/rateLimit';
import { createServiceClient } from '@/lib/supabase/admin';
import { validateBirth } from '@/lib/tools/birth';
import { calculateNatal } from '@/lib/ephemeris/calculateNatal';
import { computeAshtakoot, nakshatraNameToIndex } from '@/lib/synastry/ashtakoot';
import { buildSynastryCommentary } from '@/lib/synastry/synastryCommentary';

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

function signToIndex(sign: string): number {
  const i = SIGNS.findIndex((s) => s.toLowerCase() === sign.trim().toLowerCase());
  return i >= 0 ? i : -1;
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

  // One entitlement shouldn't be replayable into unbounded LLM spend (deep compute runs
  // Anthropic/OpenAI calls with a long maxDuration). Per-user sliding-window cap.
  const rl = await checkRateLimit(`compute:${auth.user.id}`, RATE_LIMITS.compute.limit, RATE_LIMITS.compute.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many deep-report requests — please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const db = createServiceClient();
  const { count, error: cntErr } = await db
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .in('payment_status', ['paid', 'promo']);

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
    partner_a?: BirthPayload;
    partner_b?: BirthPayload;
  };
  const rawA = body?.partnerA ?? body?.partner_a;
  const rawB = body?.partnerB ?? body?.partner_b;
  const validA = validateBirth(rawA);
  const validB = validateBirth(rawB);
  if (!validA.ok || !validB.ok) {
    const issue = !validA.ok ? validA : !validB.ok ? validB : null;
    return NextResponse.json({ error: issue?.message, code: issue?.code }, { status: 400 });
  }
  const a = { ...validA.person, name: typeof rawA?.name === 'string' ? rawA.name.slice(0, 100) : undefined };
  const b = { ...validB.person, name: typeof rawB?.name === 'string' ? rawB.name.slice(0, 100) : undefined };

  const [chartA, chartB] = await Promise.all([
    calculateNatal(a, request.signal).catch(() => null),
    calculateNatal(b, request.signal).catch(() => null),
  ]);
  if (!chartA || !chartB) {
    return NextResponse.json({ error: 'Birth chart calculation failed' }, { status: 502 });
  }

  const moonA = chartA.planets?.Moon;
  const moonB = chartB.planets?.Moon;
  const nakA = nakshatraNameToIndex(moonA?.nakshatra ?? chartA.moon_nakshatra);
  const nakB = nakshatraNameToIndex(moonB?.nakshatra ?? chartB.moon_nakshatra);
  const sigA = signToIndex(moonA?.sign ?? '');
  const sigB = signToIndex(moonB?.sign ?? '');
  if (nakA < 0 || nakB < 0 || sigA < 0 || sigB < 0) {
    return NextResponse.json(
      { error: 'Could not resolve Moon sign/nakshatra from the birth charts.' },
      { status: 502 },
    );
  }

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
