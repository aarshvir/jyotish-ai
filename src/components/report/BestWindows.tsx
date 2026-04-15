import { motion } from 'framer-motion';
import { buildLagnaContext } from '@/lib/agents/lagnaContext';

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

export function BestWindows({ hours, lagna = 'Cancer' }: BestWindowsProps) {
  const lagnaCtx = buildLagnaContext(lagna);
  const horaTooltips: Record<string, string> = Object.fromEntries(
    Object.entries(lagnaCtx.horaRoles).map(([planet, role]) => [planet, role.description])
  );
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
          <p className="font-mono text-mono-sm text-dust tracking-[0.15em] uppercase mb-3">
            Optimal Windows
          </p>
          <div className="flex flex-wrap gap-2">
            {optimal.map((hour, i) => {
              const tl = slotTimeLabel(hour);
              const tooltip = hour.reason || horaTooltips[hour.hora_planet] || `${hour.hora_planet} hora — optimal for key activities`;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-success/10 border border-success/20"
                  title={tooltip}
                >
                  <span className="font-mono text-mono-sm text-success">
                    {tl.start}–{tl.end}
                  </span>
                  <span className="text-success">·</span>
                  <span className="text-success text-sm">
                    {hour.hora_planet_symbol || PLANET_SYMBOLS[hour.hora_planet] || hour.hora_planet}
                  </span>
                  <span className="text-success">·</span>
                  <span className="font-mono text-mono-sm text-success/70">
                    {hour.choghadiya}
                  </span>
                  <span className="text-success">·</span>
                  <span className="font-mono text-mono-sm text-success font-medium">
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
          <p className="font-mono text-mono-sm text-dust tracking-[0.15em] uppercase mb-3">
            Rahu Kaal
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-caution/10 border border-caution/20">
            <span className="text-caution">⚠</span>
            <span className="font-mono text-mono-sm text-caution">
              {slotTimeLabel(rahuKaal[0]).start}–{slotTimeLabel(rahuKaal[rahuKaal.length - 1]).end}
            </span>
            <span className="text-caution/50">·</span>
            <span className="font-mono text-mono-sm text-caution/70">
              Complete avoidance advised
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
