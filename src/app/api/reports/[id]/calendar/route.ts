/**
 * GET /api/reports/[id]/calendar
 *
 * Returns an .ics (iCalendar) file containing:
 * - Strategic windows (best dates) as calendar events
 * - Caution dates as "tentative / busy" events
 *
 * Lets users drop their best timing windows directly into Google Calendar,
 * Apple Calendar, or any iCal-compatible app — making the report permanently useful.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';

interface StrategicWindow {
  date?: string;
  score?: number;
  reason?: string;
}

function escapeIcal(s: string): string {
  return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatIcalDate(dateStr: string): string {
  // Convert "YYYY-MM-DD" to "YYYYMMDD" (all-day event format)
  return dateStr.replace(/-/g, '');
}

function uid(prefix: string, date: string, i: number): string {
  return `${prefix}-${date}-${i}@vedichour.com`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const db = createServiceClient();
  const { data: row, error } = await db
    .from('reports')
    .select('report_data, user_id, native_name')
    .eq('id', params.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Auth: only the report owner can download
  if (row.user_id !== auth.user.id && !auth.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const reportData = row.report_data as {
    synthesis?: {
      strategic_windows?: StrategicWindow[];
      caution_dates?: StrategicWindow[];
    };
  } | null;

  const synthesis = reportData?.synthesis;
  const windows: StrategicWindow[] = synthesis?.strategic_windows ?? [];
  const caution: StrategicWindow[] = synthesis?.caution_dates ?? [];
  const name = (row.native_name as string | null) ?? 'Your';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VedicHour//Timing Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcal(name + "'s VedicHour Timing")}`,
    'X-WR-TIMEZONE:UTC',
  ];

  // Strategic windows — green/best dates
  windows.forEach((w, i) => {
    if (!w.date) return;
    const reason = w.reason ? escapeIcal(w.reason) : 'A strong window — good for important decisions and new initiatives.';
    const dateStr = formatIcalDate(w.date);
    // All-day event: DTSTART;VALUE=DATE = date, DTEND = next day
    const endDate = formatIcalDate(
      new Date(new Date(w.date).getTime() + 86400000).toISOString().slice(0, 10)
    );
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid('best', w.date, i)}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:⭐ Best timing window${w.score ? ` (${w.score}/100)` : ''}`,
      `DESCRIPTION:${reason}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Your best timing window today — VedicHour',
      'TRIGGER:-PT8H',
      'END:VALARM',
      'END:VEVENT',
    );
  });

  // Caution dates — red/avoid dates
  caution.forEach((c, i) => {
    if (!c.date) return;
    const reason = c.reason ? escapeIcal(c.reason) : 'Move with care today — better for patience and completion than new starts.';
    const dateStr = formatIcalDate(c.date);
    const endDate = formatIcalDate(
      new Date(new Date(c.date).getTime() + 86400000).toISOString().slice(0, 10)
    );
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid('caution', c.date, i)}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:⚠ Go slower${c.score ? ` (${c.score}/100)` : ''}`,
      `DESCRIPTION:${reason}`,
      'STATUS:TENTATIVE',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');

  const icsContent = lines.join('\r\n');
  const safeName = (row.native_name as string || 'VedicHour').replace(/[^a-zA-Z0-9_-]/g, '_');

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="VedicHour_${safeName}_timing.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
