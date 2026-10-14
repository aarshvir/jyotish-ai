import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { cacheGet, cacheSet, stableCacheKey } from '@/lib/redis/cache';
import { cityCandidates } from '@/lib/tools/birth';
import { requestJson, RequestTimeout } from '@/lib/tools/requests';

export const dynamic = 'force-dynamic';
const cacheHeaders = { 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400' };

export async function GET(req: NextRequest) {
  try {
    const { allowed } = await checkRateLimit(`geocode:${getRateLimitKey(req)}`, 30, 60_000);
    if (!allowed) return NextResponse.json({ error: 'Too many searches. Try again in a minute.' }, { status: 429 });
    const city = (req.nextUrl.searchParams.get('city') ?? '').trim();
    if (city.length < 2 || city.length > 120 || /[\u0000-\u001f]/.test(city)) {
      return NextResponse.json({ error: 'Enter a city and country (2 to 120 characters).' }, { status: 400 });
    }
    const key = stableCacheKey('geo:candidates:v1', city.toLowerCase());
    const cached = await cacheGet<unknown>(key).catch(() => null);
    if (Array.isArray(cached)) return NextResponse.json(cityCandidates(cached), { headers: cacheHeaders });
    const { response, data } = await requestJson(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=5&accept-language=en`,
      { headers: { 'User-Agent': 'VedicHour/1.0 (vedichour.com)' }, signal: req.signal }, 6_000,
    );
    if (!response.ok || !Array.isArray(data)) {
      return NextResponse.json({ error: 'City search is temporarily unavailable. Try again.' }, { status: 503 });
    }
    const candidates = cityCandidates(data);
    void cacheSet(key, candidates, 604_800).catch(() => undefined);
    return NextResponse.json(candidates, { headers: cacheHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestTimeout ? 'City search took too long. Try again.' : 'City search is temporarily unavailable. Try again.' }, { status: error instanceof RequestTimeout ? 504 : 503 });
  }
}
