'use client';

import { useState, useRef } from 'react';

interface HourData {
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

interface HourlyChartProps {
  hours: HourData[];
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄',
};

function toMinutes(t: string): number {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getBarColor(score: number, isRahuKaal: boolean): string {
  if (isRahuKaal) return '#dc2626'; // crimson
  if (score >= 65) return '#10b981'; // emerald
  if (score >= 45) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function getBarStyle(hour: HourData): React.CSSProperties {
  const color = getBarColor(hour.score, hour.is_rahu_kaal);
  if (hour.is_rahu_kaal) {
    return {
      background: `repeating-linear-gradient(45deg, ${color}, ${color} 3px, #1a0505 3px, #1a0505 7px)`,
    };
  }
  return { backgroundColor: color };
}

const MAX_BAR_HEIGHT = 180; // px

export function HourlyChart({ hours }: HourlyChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!hours?.length) {
    return (
      <div className="py-12 text-center">
        <p className="font-mono text-xs text-dust/50">No hourly data to display.</p>
      </div>
    );
  }

  const sortedHours = [...hours].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  // Time label every ~4 slots or at most 6 labels
  const labelStep = Math.max(1, Math.floor(sortedHours.length / 6));
  const timeLabels = sortedHours.map((h, i) => ({
    hour: h,
    showLabel: i % labelStep === 0 || i === sortedHours.length - 1,
    index: i,
  }));

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Chart area */}
      <div
        className="flex items-end gap-[2px] w-full"
        style={{ height: `${MAX_BAR_HEIGHT + 4}px` }}
      >
        {sortedHours.map((hour, i) => {
          const safeScore = Number.isFinite(Number(hour.score)) ? Number(hour.score) : 50;
          const barH = Math.max(6, (safeScore / 100) * MAX_BAR_HEIGHT);
          const isHovered = hoveredIndex === i;

          return (
            <div
              key={i}
              className="flex-1 relative cursor-pointer transition-opacity"
              style={{ height: `${barH}px`, opacity: isHovered ? 1 : 0.85 }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className="w-full h-full rounded-t-sm"
                style={{
                  ...getBarStyle(hour),
                  transform: isHovered ? 'scaleY(1.05)' : 'scaleY(1)',
                  transformOrigin: 'bottom',
                  transition: 'transform 0.15s ease',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis time labels */}
      <div className="flex mt-2">
        {sortedHours.map((hour, i) => (
          <div key={i} className="flex-1 relative">
            {timeLabels[i]?.showLabel && (
              <span
                className="absolute left-0 font-mono text-[8px] text-dust/60 whitespace-nowrap"
                style={{ transform: 'translateX(-50%)' }}
              >
                {hour.time?.slice(0, 5)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && (() => {
        const h = sortedHours[hoveredIndex];
        if (!h) return null;
        const scoreColor = h.is_rahu_kaal ? '#dc2626' : h.score >= 65 ? '#10b981' : h.score >= 45 ? '#f59e0b' : '#ef4444';

        return (
          <div
            className="absolute bottom-full left-1/2 mb-3 z-50 pointer-events-none"
            style={{
              transform: `translateX(calc(-50% + ${(hoveredIndex - sortedHours.length / 2) * 8}px))`,
            }}
          >
            <div className="bg-cosmos border border-horizon rounded-sm shadow-xl p-4 min-w-[220px] max-w-[300px]">
              <div className="font-mono text-xs text-amber font-semibold mb-2">
                {h.time?.slice(0, 5)} – {h.end_time?.slice(0, 5)}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-amber">
                  {h.hora_planet_symbol || PLANET_SYMBOLS[h.hora_planet] || ''}
                </span>
                <span className="font-mono text-xs text-dust">{h.hora_planet} Hora</span>
              </div>
              {h.transit_lagna && (
                <div className="font-mono text-xs text-dust/70 mb-1">
                  {h.transit_lagna} · H{h.transit_lagna_house}
                </div>
              )}
              <div className="font-mono text-xs text-dust/60 mb-2">{h.choghadiya}</div>
              <div className="font-display text-2xl font-bold mb-2" style={{ color: scoreColor }}>
                {h.is_rahu_kaal ? '⚠ ' : ''}{h.score}
              </div>
              {h.commentary && (
                <p className="font-display text-xs text-star/80 italic leading-[1.6]">
                  {h.commentary.slice(0, 120)}{h.commentary.length > 120 ? '…' : ''}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-horizon/30">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
          <span className="font-mono text-[10px] text-dust/60">Peak (≥65)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
          <span className="font-mono text-[10px] text-dust/60">Neutral (45–65)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
          <span className="font-mono text-[10px] text-dust/60">Caution (&lt;45)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'repeating-linear-gradient(45deg, #dc2626, #dc2626 3px, #1a0505 3px, #1a0505 7px)' }} />
          <span className="font-mono text-[10px] text-dust/60">Rahu Kaal</span>
        </div>
      </div>
    </div>
  );
}
