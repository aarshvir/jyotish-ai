import { NextRequest, NextResponse } from 'next/server';

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
          'User-Agent': 'Jyotish-AI/1.0',
        },
      }
    );

    if (!response.ok) {
      console.error('❌ Geocode API - Nominatim error:', response.status);
      return NextResponse.json(
        { error: 'Geocoding service unavailable' },
        { status: 503 }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Geocode API error:', error);
    return NextResponse.json(
      { error: error.message || 'Geocoding failed' },
      { status: 500 }
    );
  }
}
