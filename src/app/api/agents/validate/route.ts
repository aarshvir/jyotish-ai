import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const birthData = await request.json();

    const errors: string[] = [];

    if (!birthData.date) errors.push('Date is required');
    if (!birthData.time) errors.push('Time is required');
    if (!birthData.latitude) errors.push('Latitude is required');
    if (!birthData.longitude) errors.push('Longitude is required');
    if (!birthData.timezone) errors.push('Timezone is required');

    if (birthData.latitude && (birthData.latitude < -90 || birthData.latitude > 90)) {
      errors.push('Latitude must be between -90 and 90');
    }

    if (birthData.longitude && (birthData.longitude < -180 || birthData.longitude > 180)) {
      errors.push('Longitude must be between -180 and 180');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Birth data is valid' 
    });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}
