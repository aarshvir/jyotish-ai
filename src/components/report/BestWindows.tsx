import { motion } from 'framer-motion';

interface HourData {
  time: string;
  end_time: string;
  display_label?: string;
  score: number;
  hora_planet: string;
  hora_planet_symbol?: string;
  choghadiya: string;
  is_rahu_kaal: boolean;
  reason?: string;
}

function slotTimeLabel(h: HourData): { start: string; end: string } {
  if (h.time && h.end_time) {
    return { start: h.time.slice(0, 5), end: h.end_time.slice(0, 5) };
  }
  const raw = h.display_label ?? '';
  const parts = raw.split(/\u2013|-/).map((s) => s.trim());
  if (parts.length >= 2) {
    return { start: parts[0].slice(0, 5), end: parts[1].slice(0, 5) };
  }
  return { start: h.time || '—', end: h.end_time || '—' };
}

interface BestWindowsProps {
  hours: HourData[];
  lagna?: string;
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄',
};

const HORA_TOOLTIPS: Record<string, string> = {
  Moon: 'Lagna lord hora — peak emotional clarity and personal authority',
  Mars: 'Yogakaraka hora — strongest career and intelligence activation',
  Jupiter: '9th lord hora — dharma, wisdom, mentors, and fortune',
  Mercury: '12th lord hora — research and writing, but watch for scattered energy',
  Saturn: 'Badhaka hora — avoid new initiatives, good for discipline and routine',
  Sun: 'Functional neutral — authority and government matters',
  Venus: '4th+11th lord hora — mixed, good for comfort and networking',
};

export function BestWindows({ hours, lagna = 'Cancer' }: BestWindowsProps) {
  // Find top 3 optimal hours (excluding Rahu Kaal)
  const optimal = hours
    .filter((h) => !h.is_rahu_kaal)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Find Rahu Kaal period
  const rahuKaal = hours.filter((h) => h.is_rahu_kaal);

  return (
    <div className="space-y-4 mt-6">
      {/* Optimal Windows */}
      {optimal.length > 0 && (
        <div>
          <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3">
            Optimal Windows
          </p>
          <div className="flex flex-wrap gap-2">
            {optimal.map((hour, i) => {
              const tl = slotTimeLabel(hour);
              const tooltip = hour.reason || HORA_TOOLTIPS[hour.hora_planet] || `${hour.hora_planet} hora — optimal for key activities`;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-emerald/10 border border-emerald/20"
                  title={tooltip}
                >
                  <span className="font-mono text-xs text-emerald">
                    {tl.start}–{tl.end}
                  </span>
                  <span className="text-emerald">·</span>
                  <span className="text-emerald text-sm">
                    {hour.hora_planet_symbol || PLANET_SYMBOLS[hour.hora_planet] || hour.hora_planet}
                  </span>
                  <span className="text-emerald">·</span>
                  <span className="font-mono text-xs text-emerald/70">
                    {hour.choghadiya}
                  </span>
                  <span className="text-emerald">·</span>
                  <span className="font-mono text-xs text-emerald font-medium">
                    {hour.score}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rahu Kaal */}
      {rahuKaal.length > 0 && (
        <div>
          <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3">
            Rahu Kaal
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-crimson/10 border border-crimson/20">
            <span className="text-crimson">⚠</span>
            <span className="font-mono text-xs text-crimson">
              {slotTimeLabel(rahuKaal[0]).start}–{slotTimeLabel(rahuKaal[rahuKaal.length - 1]).end}
            </span>
            <span className="text-crimson/50">·</span>
            <span className="font-mono text-xs text-crimson/70">
              Complete avoidance advised
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
