'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

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
  commentary: string;
}

interface HourlyChartProps {
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

const CHOGHADIYA_COLORS: Record<string, string> = {
  Amrit: 'text-emerald',
  Labh: 'text-emerald',
  Shubh: 'text-emerald',
  Chal: 'text-amber',
  Rog: 'text-crimson',
  Kaal: 'text-crimson',
  Udveg: 'text-crimson',
};

export function HourlyChart({ hours }: HourlyChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const getBarColor = (hour: HourData) => {
    if (hour.score >= 70) return 'bg-emerald';
    if (hour.score >= 50) return 'bg-amber';
    return 'bg-crimson';
  };

  const getBarHeight = (score: number) => {
    const min = 6;
    const max = 100;
    return Math.max(min, (score / 100) * max);
  };

  const handleMouseEnter = (index: number, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Show time labels for every 3 hours
  const timeLabels = hours.filter((_, i) => i % 3 === 0);

  return (
    <div className="relative">
      {/* Chart */}
      <div className="flex items-end gap-[2px] h-[120px] mb-4">
        {hours.map((hour, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, delay: i * 0.02, ease: 'easeOut' }}
            className="relative flex-1 origin-bottom cursor-pointer group"
            style={{ height: `${getBarHeight(hour.score)}px` }}
            onMouseEnter={(e) => handleMouseEnter(i, e)}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className={`w-full h-full rounded-t-sm ${getBarColor(hour)} ${
                hour.is_rahu_kaal
                  ? 'relative overflow-hidden'
                  : ''
              }`}
            >
              {hour.is_rahu_kaal && (
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.3) 3px, rgba(0,0,0,0.3) 6px)',
                  }}
                />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Time labels */}
      <div className="flex justify-between px-1">
        {timeLabels.map((hour, i) => (
          <span key={i} className="font-mono text-[9px] text-dust">
            {hour.time}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed z-50 bg-cosmos border border-horizon rounded-sm shadow-xl p-4 min-w-[220px] max-w-[340px] pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {/* Time */}
          <div className="font-mono text-sm text-star font-semibold mb-3">
            {hours[hoveredIndex].time} – {hours[hoveredIndex].end_time}
          </div>

          {/* Hora planet */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber text-base">
              {hours[hoveredIndex].hora_planet_symbol || PLANET_SYMBOLS[hours[hoveredIndex].hora_planet] || ''}
            </span>
            <span className="font-mono text-xs text-dust">
              {hours[hoveredIndex].hora_planet} Hora
            </span>
          </div>

          {/* Choghadiya */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 rounded-full ${
                hours[hoveredIndex].score >= 70
                  ? 'bg-emerald'
                  : hours[hoveredIndex].score >= 50
                  ? 'bg-amber'
                  : 'bg-crimson'
              }`}
            />
            <span
              className={`font-mono text-xs ${
                CHOGHADIYA_COLORS[hours[hoveredIndex].choghadiya] || 'text-dust'
              }`}
            >
              {hours[hoveredIndex].choghadiya}
            </span>
          </div>

          {/* Transit Lagna */}
          {hours[hoveredIndex].transit_lagna && (
            <div className="font-mono text-xs text-dust mb-3">
              {hours[hoveredIndex].transit_lagna} (House {hours[hoveredIndex].transit_lagna_house})
            </div>
          )}

          {/* Score */}
          <div
            className={`font-display text-3xl font-semibold mb-3 ${
              hours[hoveredIndex].score >= 70
                ? 'text-emerald'
                : hours[hoveredIndex].score >= 50
                ? 'text-amber'
                : 'text-crimson'
            }`}
          >
            {hours[hoveredIndex].score}
          </div>

          {/* Commentary */}
          <p className="font-display text-sm text-star italic leading-[1.6]">
            {hours[hoveredIndex].commentary}
          </p>
        </motion.div>
      )}
    </div>
  );
}
