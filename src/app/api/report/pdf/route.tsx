/**
 * Report PDF API route
 *
 * Accepts report data via POST and returns a PDF of the full report.
 * Uses @react-pdf/renderer for server-side PDF generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 18, marginBottom: 20, fontWeight: 'bold' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, marginBottom: 8, fontWeight: 'bold' },
  body: { marginBottom: 6, lineHeight: 1.4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 100, fontWeight: 'bold' },
  value: { flex: 1 },
  table: { marginTop: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, paddingVertical: 4 },
  tableHeader: { fontWeight: 'bold', backgroundColor: '#f5f5f5' },
  tableCell: { flex: 1, paddingHorizontal: 4 },
  slotCommentary: { fontSize: 8, color: '#555', marginTop: 2 },
});

interface PdfReportPayload {
  name: string;
  date: string;
  time: string;
  city: string;
  natalChart?: { lagna?: string; moon_nakshatra?: string; current_dasha?: { mahadasha?: string; antardasha?: string } };
  commentary?: {
    nativity_summary?: string;
    monthly?: Array<{ month?: string; commentary?: string; score?: number }>;
    weekly?: Array<{ week_label?: string; commentary?: string; score?: number }>;
    daily?: Array<{ date?: string; day_overview?: string; day_score?: number }>;
    period_synthesis?: string;
  };
  mergedDays?: Array<{
    date: string;
    day_score: number;
    day_overview?: string;
    day_theme?: string;
    panchang?: { tithi?: string; nakshatra?: string; yoga?: string; karana?: string; moon_sign?: string };
    rahu_kaal?: { start?: string; end?: string } | null;
    hourlySlots?: Array<{
      display_label: string;
      hora_planet: string;
      choghadiya: string;
      score: number;
      commentary?: string;
    }>;
  }>;
}

function ReportPdfDocument({ payload }: { payload: PdfReportPayload }) {
  const { name, date, time, city, natalChart, commentary, mergedDays } = payload;
  const safeCommentary = commentary ?? {};
  const safeMonthly = Array.isArray(safeCommentary.monthly) ? safeCommentary.monthly : [];
  const safeWeekly = Array.isArray(safeCommentary.weekly) ? safeCommentary.weekly : [];
  const days = mergedDays ?? [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>VedicHour — Report: {name}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nativity</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Birth:</Text>
            <Text style={styles.value}>{date} {time} — {city}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Lagna:</Text>
            <Text style={styles.value}>{natalChart?.lagna ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dasha:</Text>
            <Text style={styles.value}>
              {natalChart?.current_dasha?.mahadasha ?? '—'} / {natalChart?.current_dasha?.antardasha ?? '—'}
            </Text>
          </View>
          {safeCommentary.nativity_summary ? (
            <Text style={styles.body}>{safeCommentary.nativity_summary}</Text>
          ) : null}
        </View>

        {safeMonthly.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Analysis</Text>
            {safeMonthly.slice(0, 12).map((m: any, i: number) => (
              <View key={i} style={styles.section}>
                <Text style={styles.label}>{m.month ?? `Month ${i + 1}`} (Score: {m.score ?? '—'})</Text>
                <Text style={styles.body}>{m.commentary ?? ''}</Text>
              </View>
            ))}
          </View>
        )}

        {safeWeekly.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Analysis</Text>
            {safeWeekly.map((w: any, i: number) => (
              <View key={i} style={styles.section}>
                <Text style={styles.label}>{w.week_label ?? `Week ${i + 1}`} (Score: {w.score ?? '—'})</Text>
                <Text style={styles.body}>{w.commentary ?? ''}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>

      {days.map((day, dayIdx) => (
        <Page key={dayIdx} size="A4" style={styles.page} wrap>
          <Text style={styles.title}>Daily Forecast — {day.date}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Score:</Text>
            <Text style={styles.value}>{day.day_score}/100</Text>
          </View>
          {day.panchang && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Panchang</Text>
              <Text style={styles.body}>
                Tithi: {day.panchang.tithi ?? '—'} | Nakshatra: {day.panchang.nakshatra ?? '—'} | Yoga: {day.panchang.yoga ?? '—'} | Karana: {day.panchang.karana ?? '—'} | Moon: {day.panchang.moon_sign ?? '—'}
              </Text>
            </View>
          )}
          {day.rahu_kaal && (
            <Text style={styles.body}>Rahu Kaal: {day.rahu_kaal.start ?? ''} – {day.rahu_kaal.end ?? ''}</Text>
          )}
          {day.day_overview ? (
            <Text style={styles.body}>{day.day_overview}</Text>
          ) : null}

          {Array.isArray(day.hourlySlots) && day.hourlySlots.length > 0 && (
            <View style={styles.table}>
              <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Hour-by-Hour</Text>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>Time</Text>
                <Text style={[styles.tableCell, { flex: 0.6 }]}>Hora</Text>
                <Text style={[styles.tableCell, { flex: 0.6 }]}>Choghadiya</Text>
                <Text style={[styles.tableCell, { flex: 0.4 }]}>Score</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Commentary</Text>
              </View>
              {day.hourlySlots.map((slot: any, si: number) => (
                <View key={si} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{slot.display_label ?? '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.6 }]}>{slot.hora_planet ?? '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.6 }]}>{slot.choghadiya ?? '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 0.4 }]}>{slot.score ?? '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }, styles.slotCommentary]}>
                    {(slot.commentary ?? '').slice(0, 120)}{(slot.commentary?.length ?? 0) > 120 ? '…' : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Page>
      ))}

      {safeCommentary.period_synthesis && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>Period Synthesis</Text>
          <Text style={styles.body}>{safeCommentary.period_synthesis}</Text>
        </Page>
      )}
    </Document>
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload: PdfReportPayload = await request.json();

    if (!payload?.name) {
      return NextResponse.json(
        { error: 'Missing required report data (name)' },
        { status: 400 }
      );
    }

    const blob = await pdf(<ReportPdfDocument payload={payload} />).toBlob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    const filename = `Jyotish_AI_Report_${payload.name.replace(/\s+/g, '_')}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error('PDF generation error:', err);
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
