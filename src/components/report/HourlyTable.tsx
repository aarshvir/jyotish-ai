'use client';

import { useState, useMemo } from 'react';
import {
  getCanonicalScoreLabel,
  getLabelColor,
  getLabelIcon,
  getScoreNumColor,
} from '@/lib/guidance/labels';
import type { SlotGuidanceV2 } from '@/lib/guidance/types';

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
  guidance_v2?: SlotGuidanceV2;
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
  const ratingLabel = getCanonicalScoreLabel(score, isRahuKaal);
  if (isRahuKaal) return { label: 'RAHU KAAL', color: 'text-caution', icon: '⚠' };
  const color = getLabelColor(ratingLabel);
  const icon = getLabelIcon(ratingLabel, isRahuKaal);
  return { label: `${icon} ${ratingLabel.toUpperCase()}`, color, icon };
}

function getChoghadiyaBg(choghadiya: string): string {
  if (['Amrit', 'Labh', 'Shubh'].includes(choghadiya)) return 'bg-success/10 border-success/20 text-success';
  if (['Chal', 'Char'].includes(choghadiya)) return 'bg-amber/10 border-amber/20 text-amber';
  return 'bg-caution/10 border-caution/20 text-caution';
}

export function HourlyTable({ hours }: HourlyTableProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const sortedHours = useMemo(
    () => [...(hours ?? [])].sort((a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0)),
    [hours],
  );
  const hasDataError = sortedHours.length !== 18;
  const displayCommentary = (c: string | undefined) => (c?.trim() || COMMENTARY_FALLBACK);

  return (
    <>
      {/* Mobile card view — shown below md */}
      <div className="md:hidden space-y-2">
        {hasDataError && (
          <div className="py-3 px-3 font-mono text-mono-sm text-caution bg-caution/10 border border-caution/30 rounded-sm">
            ⚠ Data error: expected 18 slots, got {sortedHours.length}.
          </div>
        )}
        {sortedHours.map((hour, i) => {
          const scoreInfo = getScoreLabel(hour.score, hour.is_rahu_kaal);
          const isExpanded = expandedIndex === i;
          const commentary = displayCommentary(hour.commentary);
          const timeLabel = hour.display_label ?? hour.time?.slice(0, 5) ?? '—';

          return (
            <div
              key={`card-${hour.slot_index ?? i}`}
              className={`border rounded-sm transition-colors ${
                hour.is_rahu_kaal
                  ? 'border-caution/30 bg-caution/5'
                  : 'border-horizon bg-cosmos'
              } ${isExpanded ? 'border-amber/40' : ''}`}
            >
              {/* Card header — tappable */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-[52px]"
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                aria-expanded={isExpanded}
                aria-label={`${timeLabel} – ${scoreInfo.label}`}
              >
                {/* Time + icon */}
                <span className="font-mono text-sm text-star whitespace-nowrap w-24 shrink-0">
                  <span className={`mr-1 ${scoreInfo.color}`}>
                    {hour.is_rahu_kaal ? '⚠' : hour.score >= 75 ? '★' : hour.score < 45 ? '🔴' : ''}
                  </span>
                  {timeLabel}
                </span>

                {/* Hora */}
                <span className="flex items-center gap-1 min-w-0">
                  <span className="text-amber text-sm shrink-0">
                    {hour.hora_planet_symbol || PLANET_SYMBOLS[hour.hora_planet] || ''}
                  </span>
                  <span className="font-mono text-mono-sm text-dust truncate">
                    {hour.hora_planet}
                  </span>
                </span>

                {/* Choghadiya */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border font-mono text-mono-sm shrink-0 ${getChoghadiyaBg(hour.choghadiya)}`}>
                  {hour.choghadiya}
                </span>

                {/* Score — pushed right */}
                <span className={`font-mono text-base font-bold ml-auto shrink-0 ${getScoreNumColor(hour.score, hour.is_rahu_kaal)}`}>
                  {Number.isFinite(Number(hour.score)) ? hour.score : '—'}
                </span>

                {/* Expand chevron */}
                <span className={`font-mono text-mono-sm text-dust/40 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>

              {/* Expanded commentary + V2 guidance */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-horizon/30">
                  <div className="flex items-center gap-2 mt-3 mb-2 flex-wrap">
                    <span className={`font-mono text-mono-sm ${scoreInfo.color}`}>{scoreInfo.label}</span>
                    {hour.transit_lagna && (
                      <span className="font-mono text-mono-sm text-dust/60">
                        {hour.transit_lagna}{hour.transit_lagna_house ? ` · H${hour.transit_lagna_house}` : ''}
                      </span>
                    )}
                  </div>

                  {/* V2 guidance chips */}
                  {hour.guidance_v2 && (
                    <div className="space-y-2 mb-3">
                      {hour.guidance_v2.best_for.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="font-mono text-mono-sm text-success/70 mr-1">Best for:</span>
                          {hour.guidance_v2.best_for.map((b, bi) => (
                            <span key={bi} className="px-2 py-0.5 rounded-sm bg-success/10 border border-success/20 font-mono text-mono-sm text-success">{b}</span>
                          ))}
                        </div>
                      )}
                      {hour.guidance_v2.avoid_for.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="font-mono text-mono-sm text-caution/70 mr-1">Avoid:</span>
                          {hour.guidance_v2.avoid_for.map((a, ai) => (
                            <span key={ai} className="px-2 py-0.5 rounded-sm bg-caution/10 border border-caution/20 font-mono text-mono-sm text-caution">{a}</span>
                          ))}
                        </div>
                      )}
                      {hour.guidance_v2.still_ok_for.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="font-mono text-mono-sm text-amber/70 mr-1">Still OK:</span>
                          {hour.guidance_v2.still_ok_for.map((s, si) => (
                            <span key={si} className="px-2 py-0.5 rounded-sm bg-amber/10 border border-amber/20 font-mono text-mono-sm text-amber">{s}</span>
                          ))}
                        </div>
                      )}
                      {hour.guidance_v2.if_unavoidable && (
                        <p className="font-mono text-mono-sm text-dust/80 italic">
                          {hour.guidance_v2.if_unavoidable}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="font-display text-star text-body-sm leading-[1.8]">
                    {hour.guidance_v2?.summary_plain || commentary}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table — shown at md and above */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-horizon">
              <th className="font-mono text-mono-sm uppercase text-dust text-left py-3 px-3 whitespace-nowrap">
                Time
              </th>
              <th className="font-mono text-mono-sm uppercase text-dust text-left py-3 px-3">
                Hora
              </th>
              <th className="font-mono text-mono-sm uppercase text-dust text-left py-3 px-3">
                Choghadiya
              </th>
              <th className="font-mono text-mono-sm uppercase text-dust text-left py-3 px-3 hidden lg:table-cell">
                Transit Lagna
              </th>
              <th className="font-mono text-mono-sm uppercase text-dust text-center py-3 px-3">
                Score
              </th>
              <th className="font-mono text-mono-sm uppercase text-dust text-left py-3 px-3">
                Commentary
              </th>
            </tr>
          </thead>
          <tbody>
            {hasDataError && (
              <tr className="bg-caution/20 border-b border-caution/40">
                <td colSpan={6} className="py-3 px-3 font-mono text-mono-sm text-caution">
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
                      hour.is_rahu_kaal ? 'bg-caution/5' : ''
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
                        <span className="font-mono text-mono-sm text-dust">
                          {hour.hora_planet}
                        </span>
                      </div>
                    </td>

                    {/* Choghadiya */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border font-mono text-mono-sm ${getChoghadiyaBg(hour.choghadiya)}`}>
                        {hour.choghadiya}
                      </span>
                    </td>

                    {/* Transit Lagna */}
                    <td className="py-3 px-3 hidden lg:table-cell">
                      {hour.transit_lagna ? (
                        <span className="font-mono text-mono-sm text-dust/80 whitespace-nowrap">
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
                    <td className="py-3 px-3">
                      <span className={`pdf-exclude font-mono text-mono-sm transition-colors ${isExpanded ? 'text-amber' : 'text-dust/60 hover:text-amber'}`}>
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
                            <span className="font-mono text-mono-sm text-amber tracking-wider uppercase">
                              {hour.hora_planet} Hora · {timeLabel}
                            </span>
                            {hour.transit_lagna && (
                              <span className="font-mono text-mono-sm text-dust/60">
                                {hour.transit_lagna} H{hour.transit_lagna_house}
                              </span>
                            )}
                            <span className={`font-mono text-mono-sm font-bold ${getScoreNumColor(hour.score, hour.is_rahu_kaal)}`}>
                              {scoreInfo.icon} {hour.score}
                            </span>
                          </div>
                          <div className="font-display text-star text-body-sm leading-[1.8] whitespace-pre-line">
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
    </>
  );
}
