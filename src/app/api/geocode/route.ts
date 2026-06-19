import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { cacheGet, cacheSet, stableCacheKey } from '@/lib/redis/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { allowed } = await checkRateLimit(`geocode:${getRateLimitKey(req)}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    // Cap length before it's URL-encoded into the external Nominatim query and
    // used as a Redis cache key; no real city name needs more than this.
    const city = (req.nextUrl.searchParams.get('city') ?? '').trim().slice(0, 120);

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }

    const cacheKey = stableCacheKey('geo', city.trim().toLowerCase());
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        },
      });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'VedicHour/1.0 (vedichour.com)',
        },
      }
    );

    if (!response.ok) {
      console.error('Geocode API - Nominatim error:', response.status);
      return NextResponse.json(
        { error: 'Geocoding service unavailable' },
        { status: 503 }
      );
    }

    const data = await response.json();
    await cacheSet(cacheKey, data, 604_800);

    // Cache geocoding results for 7 days — city coordinates don't change
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    // Log the real cause server-side, but never leak internals (Redis/host/DNS
    // details) to this public, unauthenticated route.
    console.error('Geocode API error:', msg);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
