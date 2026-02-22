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

    const ephemerisResponse = await fetch(
      `${process.env.NEXT_PUBLIC_URL}/api/agents/ephemeris`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: birth_date,
          time: birth_time,
          latitude: birth_lat,
          longitude: birth_lng,
          timezone,
        }),
      }
    );

    const { data: chartData } = await ephemerisResponse.json();

    const [nativityResponse, forecastResponse] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/nativity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chartData, 
          birthData: { name, birth_date, birth_time, birth_city } 
        }),
      }),
      fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chartData, 
          birthData: { name, birth_date, birth_time, birth_city } 
        }),
      }),
    ]);

    const { data: nativityAnalysis } = await nativityResponse.json();
    const { data: forecastAnalysis } = await forecastResponse.json();

    await supabase
      .from('birth_charts')
      .update({
        nativity_profile: nativityAnalysis,
        lagna: chartData?.ascendant?.sign || null,
        moon_sign: chartData?.moon?.sign || null,
        moon_nakshatra: chartData?.moon?.nakshatra || null,
      })
      .eq('id', birthChart.id);

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        birth_chart_id: birthChart.id,
        report_type: report_type || 'Full Vedic Analysis',
        status: 'completed',
        output_json: {
          nativity: nativityAnalysis,
          forecast: forecastAnalysis,
        },
      })
      .select()
      .single();

    if (reportError) throw reportError;

    await supabase.rpc('increment_reports_used', { user_id: user.id });

    return NextResponse.json({ 
      success: true, 
      reportId: report.id 
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
