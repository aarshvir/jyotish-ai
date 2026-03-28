'use client';

/**
 * PrintAllDays — renders all 7 days with full hourly commentary.
 * Hidden on screen via CSS (`print-only` class). Shown only during @media print.
 * This bypasses the tab-based DailyAnalysis which only mounts the active day.
 */

interface HourSlot {
  slot_index?: number;
  display_label?: string;
  time?: string;
  score: number;
  hora_planet: string;
  hora_planet_symbol?: string;
  choghadiya: string;
  is_rahu_kaal: boolean;
  transit_lagna?: string;
  transit_lagna_house?: number;
  commentary?: string;
}

interface DayData {
  date: string;
  day_score: number;
  day_theme?: string;
  day_overview?: string;
  rahu_kaal?: { start: string; end: string } | null;
  panchang?: {
    tithi?: string;
    nakshatra?: string;
    yoga?: string;
    moon_sign?: string;
    day_ruler?: string;
  };
  hourlySlots?: HourSlot[];
}

interface PrintAllDaysProps {
  days: DayData[];
  reportName?: string;
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄',
};

function scoreLabel(s: number, rk: boolean) {
  if (rk) return { text: 'RAHU KAAL', color: '#e05252' };
  if (s >= 85) return { text: '★★★ PEAK', color: '#4caf7d' };
  if (s >= 75) return { text: '★★ EXCELLENT', color: '#4caf7d' };
  if (s >= 65) return { text: '★ GOOD', color: '#d4af37' };
  if (s >= 55) return { text: 'NEUTRAL', color: '#8a8090' };
  if (s >= 45) return { text: '⚠ CAUTION', color: '#e07a52' };
  if (s >= 35) return { text: '⚠⚠ DIFFICULT', color: '#e05252' };
  return { text: '🔴 AVOID', color: '#e05252' };
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

export function PrintAllDays({ days, reportName }: PrintAllDaysProps) {
  return (
    <div className="print-only" style={{ display: 'none' }}>
      {days.map((day, di) => {
        const slots = (day.hourlySlots ?? []).sort((a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0));
        const sl = scoreLabel(day.day_score, false);

        return (
          <div
            key={day.date ?? di}
            style={{ pageBreakBefore: di === 0 ? 'auto' : 'always', breakBefore: di === 0 ? 'auto' : 'page', paddingTop: '4mm' }}
          >
            {/* Day header */}
            <div style={{ borderBottom: '1px solid rgba(212,175,55,0.4)', paddingBottom: '4mm', marginBottom: '4mm' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '16pt', color: '#d4af37', margin: 0 }}>
                  {formatDate(day.date)}
                </h2>
                <span style={{ fontFamily: 'monospace', fontSize: '22pt', fontWeight: 'bold', color: sl.color }}>
                  {day.day_score}
                  <span style={{ fontSize: '10pt', color: '#8a8090', marginLeft: '4pt' }}>/100 · {sl.text}</span>
                </span>
              </div>

              {/* Panchang strip */}
              {day.panchang && (
                <div style={{ display: 'flex', gap: '12pt', marginTop: '3mm', flexWrap: 'wrap' }}>
                  {day.panchang.nakshatra && <span style={{ fontFamily: 'monospace', fontSize: '8pt', color: '#8a8090' }}>Nakshatra: {day.panchang.nakshatra}</span>}
                  {day.panchang.tithi && <span style={{ fontFamily: 'monospace', fontSize: '8pt', color: '#8a8090' }}>Tithi: {day.panchang.tithi}</span>}
                  {day.panchang.yoga && <span style={{ fontFamily: 'monospace', fontSize: '8pt', color: '#8a8090' }}>Yoga: {day.panchang.yoga}</span>}
                  {day.panchang.moon_sign && <span style={{ fontFamily: 'monospace', fontSize: '8pt', color: '#8a8090' }}>Moon: {day.panchang.moon_sign}</span>}
                  {day.rahu_kaal?.start && (
                    <span style={{ fontFamily: 'monospace', fontSize: '8pt', color: '#e05252' }}>
                      ⚠ Rahu Kaal: {day.rahu_kaal.start.slice(0, 5)} – {day.rahu_kaal.end?.slice(0, 5)}
                    </span>
                  )}
                </div>
              )}

              {/* Day theme */}
              {day.day_theme && (
                <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#d4af37', margin: '3mm 0 1mm', fontSize: '11pt' }}>
                  {day.day_theme}
                </p>
              )}

              {/* Day overview */}
              {day.day_overview && (
                <p style={{ fontFamily: 'Georgia, serif', color: '#e8e0d0', fontSize: '9pt', lineHeight: 1.7, margin: '2mm 0 0', whiteSpace: 'pre-wrap' }}>
                  {day.day_overview}
                </p>
              )}
            </div>

            {/* Hourly table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(212,175,55,0.3)' }}>
                  <th style={{ textAlign: 'left', padding: '2mm 2mm', color: '#8a8090', fontWeight: 'normal', width: '14%' }}>TIME</th>
                  <th style={{ textAlign: 'left', padding: '2mm 2mm', color: '#8a8090', fontWeight: 'normal', width: '8%' }}>HORA</th>
                  <th style={{ textAlign: 'left', padding: '2mm 2mm', color: '#8a8090', fontWeight: 'normal', width: '10%' }}>CHOGHADIYA</th>
                  <th style={{ textAlign: 'left', padding: '2mm 2mm', color: '#8a8090', fontWeight: 'normal', width: '10%' }}>TRANSIT</th>
                  <th style={{ textAlign: 'center', padding: '2mm 2mm', color: '#8a8090', fontWeight: 'normal', width: '6%' }}>SCORE</th>
                  <th style={{ textAlign: 'left', padding: '2mm 2mm', color: '#8a8090', fontWeight: 'normal' }}>COMMENTARY</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot, si) => {
                  const sl2 = scoreLabel(slot.score, slot.is_rahu_kaal);
                  const rowBg = slot.is_rahu_kaal ? 'rgba(224,82,82,0.05)' : slot.score >= 75 ? 'rgba(76,175,125,0.04)' : 'transparent';
                  const timeLabel = slot.display_label ?? slot.time?.slice(0, 5) ?? '—';
                  const commentary = (slot.commentary ?? '').trim() || `${slot.hora_planet} hora · ${slot.choghadiya} choghadiya.`;
                  const planetSym = slot.hora_planet_symbol || PLANET_SYMBOLS[slot.hora_planet] || '';

                  return (
                    <tr key={slot.slot_index ?? si} style={{ background: rowBg, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <td style={{ padding: '1.5mm 2mm', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#e8e0d0', whiteSpace: 'nowrap' }}>
                        <span style={{ color: sl2.color, marginRight: '2pt' }}>
                          {slot.is_rahu_kaal ? '⚠' : slot.score >= 75 ? '★' : slot.score < 45 ? '•' : ''}
                        </span>
                        {timeLabel}
                      </td>
                      <td style={{ padding: '1.5mm 2mm', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#d4af37' }}>
                        {planetSym} {slot.hora_planet}
                      </td>
                      <td style={{ padding: '1.5mm 2mm', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#8a8090' }}>
                        {slot.choghadiya}
                      </td>
                      <td style={{ padding: '1.5mm 2mm', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#8a8090' }}>
                        {slot.transit_lagna ? `${slot.transit_lagna}${slot.transit_lagna_house ? ` H${slot.transit_lagna_house}` : ''}` : '—'}
                      </td>
                      <td style={{ padding: '1.5mm 2mm', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', color: sl2.color }}>
                        {slot.score}
                      </td>
                      <td style={{ padding: '1.5mm 2mm', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#c8c0b0', lineHeight: 1.5, fontSize: '7.5pt' }}>
                        {commentary}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
