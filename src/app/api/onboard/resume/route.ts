export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { verifyResumeToken } from '@/lib/onboard/resumeToken';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';

/**
 * Resolves a signed resume link (from the win-back email) into the birth details
 * that person already gave us, so tapping the email lands on a filled-in form
 * instead of a blank one on their phone.
 *
 * The token is the capability: HMAC-signed, bound to one report, expiring in 45
 * days (see lib/onboard/resumeToken). It only ever returns what the holder of that
 * link typed themselves.
 */

// Values the checkout draft writes when a field was missing — never pre-fill them.
const PLACEHOLDER_NAME = 'seeker';
const PLACEHOLDER_CITY = 'unknown';

export async function GET(request: NextRequest) {
  const { allowed } = await checkRateLimit(`onboard-resume:${getRateLimitKey(request)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const reportId = verifyResumeToken(request.nextUrl.searchParams.get('t') ?? '');
  if (!reportId) {
    return NextResponse.json({ error: 'This link has expired.' }, { status: 400 });
  }

  const { data, error } = await createServiceClient()
    .from('reports')
    .select('native_name, birth_date, birth_time, birth_city, birth_lat, birth_lng, personal_context')
    .eq('id', reportId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'This link has expired.' }, { status: 404 });
  }

  const name = (data.native_name ?? '').trim();
  const city = (data.birth_city ?? '').trim();

  return NextResponse.json(
    {
      name: name.toLowerCase() === PLACEHOLDER_NAME ? '' : name,
      birthDate: data.birth_date ?? '',
      birthTime: data.birth_time ?? '',
      birthCity: city.toLowerCase() === PLACEHOLDER_CITY ? '' : city,
      birthLat: data.birth_lat ?? null,
      birthLng: data.birth_lng ?? null,
      personalContext: (data.personal_context ?? '').trim(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
