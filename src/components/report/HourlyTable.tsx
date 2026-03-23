'use client';

import { useState } from 'react';

const COMMENTARY_FALLBACK = 'Use this period according to the hora lord\'s functional role for your lagna.';

interface HourData {
  slot_index?: number;
  display_label?: string;
  time: string;
  end_time: string;
  score: number;
  hora_planet: string;
  hora_planet_symbol?: string;
  choghadiya: string;
  choghadiya_quality?: string;
  transit_lagna?: string;
  transit_lagna_house?: number;
  is_rahu_kaal: boolean;
  commentary?: string;
}

interface HourlyTableProps {
  hours: HourData[];
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
};

function getScoreLabel(score: number, isRahuKaal: boolean): { label: string; color: string; icon: string } {
  if (isRahuKaal) return { label: 'RAHU KAAL', color: 'text-crimson', icon: '⚠' };
  if (score >= 85) return { label: '★★★ PEAK', color: 'text-emerald', icon: '★★★' };
  if (score >= 75) return { label: '★★ EXCELLENT', color: 'text-emerald', icon: '★★' };
  if (score >= 65) return { label: '★ GOOD', color: 'text-amber', icon: '★' };
  if (score >= 55) return { label: 'NEUTRAL', color: 'text-dust', icon: '—' };
  if (score >= 45) return { label: '⚠ CAUTION', color: 'text-orange-400', icon: '⚠' };
  if (score >= 35) return { label: '⚠⚠ DIFFICULT', color: 'text-crimson', icon: '⚠⚠' };
  return { label: '🔴 AVOID', color: 'text-crimson', icon: '🔴' };
}

function getScoreNumColor(score: number, isRahuKaal: boolean): string {
  if (isRahuKaal || score < 45) return 'text-crimson';
  if (score >= 65) return 'text-emerald';
  if (score >= 55) return 'text-amber';
  return 'text-orange-400';
}

function getChoghadiyaBg(choghadiya: string): string {
  if (['Amrit', 'Labh', 'Shubh'].includes(choghadiya)) return 'bg-emerald/10 border-emerald/20 text-emerald';
  if (['Chal', 'Char'].includes(choghadiya)) return 'bg-amber/10 border-amber/20 text-amber';
  return 'bg-crimson/10 border-crimson/20 text-crimson';
}

export function HourlyTable({ hours }: HourlyTableProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const sortedHours = [...(hours ?? [])].sort((a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0));
  const hasDataError = sortedHours.length !== 18;
  const displayCommentary = (c: string | undefined) => (c?.trim() || COMMENTARY_FALLBACK);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-horizon">
            <th className="font-mono text-xs uppercase text-dust text-left py-3 px-3 whitespace-nowrap">
              Time
            </th>
            <th className="font-mono text-xs uppercase text-dust text-left py-3 px-3">
              Hora
            </th>
            <th className="font-mono text-xs uppercase text-dust text-left py-3 px-3">
              Choghadiya
            </th>
            <th className="font-mono text-xs uppercase text-dust text-left py-3 px-3 hidden lg:table-cell">
              Transit Lagna
            </th>
            <th className="font-mono text-xs uppercase text-dust text-center py-3 px-3">
              Score
            </th>
            <th className="font-mono text-xs uppercase text-dust text-left py-3 px-3 hidden md:table-cell">
              Commentary
            </th>
          </tr>
        </thead>
        <tbody>
          {hasDataError && (
            <tr className="bg-crimson/20 border-b border-crimson/40">
              <td colSpan={6} className="py-3 px-3 font-mono text-xs text-crimson">
                ⚠ Data error: expected 18 hourly slots (06:00–24:00), got {sortedHours.length}. Some rows may be missing.
              </td>
            </tr>
          )}
          {sortedHours.map((hour, i) => {
            const scoreInfo = getScoreLabel(hour.score, hour.is_rahu_kaal);
            const isExpanded = expandedIndex === i;
            const commentary = displayCommentary(hour.commentary);
            const timeLabel = hour.display_label ?? hour.time?.slice(0, 5) ?? '—';

            return (
              <>
                <tr
                  key={`row-${hour.slot_index ?? i}`}
                  className={`hover:bg-nebula/40 transition-colors cursor-pointer ${
                    hour.is_rahu_kaal ? 'bg-crimson/5' : ''
                  } ${isExpanded ? 'bg-nebula/20' : ''}`}
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                >
                  {/* Time */}
                  <td className="font-mono text-sm text-star py-3 px-3 whitespace-nowrap">
                    <span className={`mr-1 ${scoreInfo.color}`}>
                      {hour.is_rahu_kaal ? '⚠' : hour.score >= 75 ? '★' : hour.score < 45 ? '🔴' : ''}
                    </span>
                    {timeLabel}
                  </td>

                  {/* Hora Planet */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber text-sm">
                        {hour.hora_planet_symbol || PLANET_SYMBOLS[hour.hora_planet] || ''}
                      </span>
                      <span className="font-mono text-xs text-dust">
                        {hour.hora_planet}
                      </span>
                    </div>
                  </td>

                  {/* Choghadiya */}
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border font-mono text-xs ${getChoghadiyaBg(hour.choghadiya)}`}>
                      {hour.choghadiya}
                    </span>
                  </td>

                  {/* Transit Lagna */}
                  <td className="py-3 px-3 hidden lg:table-cell">
                    {hour.transit_lagna ? (
                      <span className="font-mono text-xs text-dust/80 whitespace-nowrap">
                        {hour.transit_lagna}
                        {hour.transit_lagna_house ? (
                          <span className="ml-1 text-amber/60">· H{hour.transit_lagna_house}</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-dust/30 text-xs">—</span>
                    )}
                  </td>

                  {/* Score */}
                  <td className="py-3 px-3 text-center">
                    <span className={`font-mono text-lg font-bold ${getScoreNumColor(hour.score, hour.is_rahu_kaal)}`}>
                      {hour.score}
                    </span>
                  </td>

                  {/* Commentary preview */}
                  <td className="py-3 px-3 hidden md:table-cell">
                    <span className={`pdf-exclude font-mono text-xs transition-colors ${isExpanded ? 'text-amber' : 'text-dust/60 hover:text-amber'}`}>
                      {isExpanded ? '↑ Close' : 'Read analysis →'}
                    </span>
                  </td>
                </tr>

                {/* Expanded commentary row */}
                {isExpanded && (
                  <tr key={`expanded-${hour.slot_index ?? i}`} className="bg-nebula/10 border-b border-horizon/20">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="max-w-3xl">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-amber text-base">
                            {hour.hora_planet_symbol || PLANET_SYMBOLS[hour.hora_planet] || ''}
                          </span>
                          <span className="font-mono text-xs text-amber tracking-wider uppercase">
                            {hour.hora_planet} Hora · {timeLabel}
                          </span>
                          {hour.transit_lagna && (
                            <span className="font-mono text-xs text-dust/60">
                              {hour.transit_lagna} H{hour.transit_lagna_house}
                            </span>
                          )}
                          <span className={`font-mono text-xs font-bold ${getScoreNumColor(hour.score, hour.is_rahu_kaal)}`}>
                            {scoreInfo.icon} {hour.score}
                          </span>
                        </div>
                        <div className="font-display text-star text-sm leading-[1.8] whitespace-pre-line">
                          {commentary}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
