import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const city = req.nextUrl.searchParams.get('city');

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
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

    // Cache geocoding results for 7 days — city coordinates don't change
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Geocoding failed';
    console.error('Geocode API error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
