export const maxDuration = 300;
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const requestData = await request.json();
    const {
      name,
      birth_date,
      birth_time,
      birth_city,
      birth_lat,
      birth_lng,
      timezone,
      current_city,
      report_type,
    } = requestData;

    const { data: birthChart, error: chartError } = await supabase
      .from('birth_charts')
      .insert({
        user_id: user.id,
        name,
        birth_date,
        birth_time,
        birth_city,
        birth_lat,
        birth_lng,
        current_city,
        timezone,
      })
      .select()
      .single();

    if (chartError) throw chartError;

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    // Forward the session cookie so child routes can pass requireAuth.
    const cookieHeader = request.headers.get('cookie') ?? '';
    const authHeaders = {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    };

    // Step 1: Ephemeris — matches /api/agents/ephemeris expected shape
    const ephemerisResponse = await fetch(
      `${baseUrl}/api/agents/ephemeris`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'natal-chart',
          birth_date,
          birth_time: birth_time?.includes(':') && birth_time.split(':').length === 2
            ? `${birth_time}:00`
            : birth_time,
          birth_city,
          birth_lat: parseFloat(birth_lat) || 0,
          birth_lng: parseFloat(birth_lng) || 0,
        }),
      }
    );

    if (!ephemerisResponse.ok) {
      const err = await ephemerisResponse.json().catch(() => ({}));
      throw new Error(err.error || 'Ephemeris calculation failed');
    }

    const ephemerisResult = await ephemerisResponse.json();
    const natalChart = ephemerisResult.data || ephemerisResult;

    // Step 2+3: Nativity + Forecast in parallel
    const today = new Date();
    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = new Date(today.getTime() + 29 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const lat = parseFloat(birth_lat) || 0;
    const lng = parseFloat(birth_lng) || 0;

    // Resolve timezone offset from stored value (minutes east of UTC).
    // Falls back to IST (330) only if the field is absent.
    const tzRaw = timezone ?? requestData.timezone_offset ?? requestData.tz_offset;
    const timezoneOffset = typeof tzRaw === 'number'
      ? tzRaw
      : typeof tzRaw === 'string' && tzRaw !== ''
        ? parseInt(tzRaw, 10) || 330
        : 330;

    const [nativityResponse, forecastResponse] = await Promise.all([
      fetch(`${baseUrl}/api/agents/nativity`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ natalChart }),
      }),
      fetch(`${baseUrl}/api/agents/forecast`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          natalChart,
          birthLat: lat,
          birthLng: lng,
          currentLat: lat,
          currentLng: lng,
          timezoneOffset,
          dateFrom,
          dateTo,
        }),
      }),
    ]);

    const nativityResult = await nativityResponse.json();
    const forecastResult = await forecastResponse.json();
    const nativityAnalysis = nativityResult.data || nativityResult;
    const forecastAnalysis = forecastResult.data || forecastResult;

    await supabase
      .from('birth_charts')
      .update({
        nativity_profile: nativityAnalysis,
        lagna: natalChart?.lagna || null,
        moon_sign: natalChart?.planets?.Moon?.sign || null,
        moon_nakshatra: natalChart?.moon_nakshatra || null,
      })
      .eq('id', birthChart.id);

    // Step 4: Commentary (dynamic generation with fallbacks)
    let commentary: Record<string, unknown> = {};
    try {
      const commentaryRes = await fetch(`${baseUrl}/api/generate-commentary`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          natalChart,
          nativity: nativityAnalysis,
          forecast: forecastAnalysis,
          reportType: report_type || 'free',
        }),
      });
      if (commentaryRes.ok) {
        const commentaryRaw = await commentaryRes.json();
        commentary = commentaryRaw.commentary || commentaryRaw.data || commentaryRaw;
      }
    } catch (commentaryErr: unknown) {
      console.warn('Commentary fetch failed (non-fatal):', commentaryErr);
    }

    const birthTimeNormalized =
      birth_time?.includes(':') && String(birth_time).split(':').length === 2
        ? `${birth_time}:00`
        : birth_time || '12:00:00';

    const reportDataPayload = {
      nativity: nativityAnalysis,
      forecast: forecastAnalysis,
      commentary,
    };

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        user_email: user.email,
        native_name: name,
        birth_date,
        birth_time: birthTimeNormalized,
        birth_city,
        birth_lat: parseFloat(birth_lat) || null,
        birth_lng: parseFloat(birth_lng) || null,
        current_city: current_city || null,
        plan_type: typeof report_type === 'string' ? report_type : '7day',
        lagna_sign: natalChart?.lagna ?? null,
        moon_sign: natalChart?.planets?.Moon?.sign ?? null,
        moon_nakshatra: natalChart?.moon_nakshatra ?? null,
        dasha_mahadasha: natalChart?.current_dasha?.mahadasha ?? null,
        dasha_antardasha: natalChart?.current_dasha?.antardasha ?? null,
        report_data: reportDataPayload,
        status: 'complete',
        generation_completed_at: new Date().toISOString(),
        payment_status: 'free',
      })
      .select()
      .single();

    if (reportError) throw reportError;

    try {
      await supabase.rpc('increment_reports_used', { user_id: user.id });
    } catch {
      // optional RPC
    }

    return NextResponse.json({
      success: true,
      reportId: report.id,
    });
  } catch (error: any) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
